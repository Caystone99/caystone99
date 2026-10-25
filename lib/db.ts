import "server-only";
import { mkdirSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";

// Notes live in Turso (libSQL). Without TURSO_DATABASE_URL, a local SQLite file is used, so it works before
// the database exists.
export type Note = {
  id: number; slug: string; title: string; topic: string; body: string; format: "markdown" | "html";
  status: "draft" | "published"; createdAt: string; updatedAt: string; publishedAt: string | null;
};

let client: Client | null = null;
let ready: Promise<void> | null = null;

function db() {
  // A serverless host has no lasting disk: there, notes need Turso.
  if (!process.env.TURSO_DATABASE_URL && process.env.VERCEL) return Promise.reject(new Error("Set TURSO_DATABASE_URL to use notes"));
  // The local file's folder has to exist before the client opens it.
  if (!process.env.TURSO_DATABASE_URL && !client) mkdirSync(".data", { recursive: true });
  client ??= createClient({
    url: process.env.TURSO_DATABASE_URL || "file:.data/notes.db",
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  });
  ready ??= (async () => {
    await client!.batch([
      `create table if not exists notes (
        id integer primary key autoincrement,
        slug text not null unique,
        title text not null,
        topic text not null default 'general',
        body text not null default '',
        status text not null default 'draft' check (status in ('draft', 'published')),
        created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        published_at text
      )`,
      "create index if not exists notes_published on notes (status, published_at desc)",
      "create index if not exists notes_topic on notes (topic, status)",
    ], "write");
    // Notes written before the editor became WYSIWYG are Markdown; newer ones are HTML.
    const cols = await client!.execute("pragma table_info(notes)");
    if (!cols.rows.some((r) => r.name === "format")) {
      await client!.execute("alter table notes add column format text not null default 'markdown'").catch((e) => {
        if (!/duplicate column/i.test(String(e))) throw e;
      });
    }
  })();
  return ready.then(() => client!);
}

const row = (r: Record<string, unknown>): Note => ({
  id: Number(r.id), slug: String(r.slug), title: String(r.title), topic: String(r.topic), body: String(r.body),
  format: r.format === "html" ? "html" : "markdown",
  status: r.status as Note["status"], createdAt: String(r.created_at), updatedAt: String(r.updated_at),
  publishedAt: r.published_at == null ? null : String(r.published_at),
});

export async function publishedNotes(opts: { topic?: string; limit?: number } = {}) {
  const c = await db();
  const res = await c.execute({
    sql: `select * from notes where status = 'published' ${opts.topic ? "and topic = ?" : ""} order by published_at desc limit ?`,
    args: [...(opts.topic ? [opts.topic] : []), opts.limit ?? 500],
  });
  return res.rows.map((r) => row(r as Record<string, unknown>));
}

export async function noteBySlug(slug: string) {
  const res = await (await db()).execute({ sql: "select * from notes where slug = ? and status = 'published'", args: [slug] });
  return res.rows[0] ? row(res.rows[0] as Record<string, unknown>) : null;
}

export async function allNotes() {
  const res = await (await db()).execute("select * from notes order by coalesce(published_at, updated_at) desc");
  return res.rows.map((r) => row(r as Record<string, unknown>));
}

export async function noteById(id: number) {
  const res = await (await db()).execute({ sql: "select * from notes where id = ?", args: [id] });
  return res.rows[0] ? row(res.rows[0] as Record<string, unknown>) : null;
}

// How many published notes each topic has, for the bench cards.
export async function countsByTopic() {
  try {
    const res = await (await db()).execute("select topic, count(*) as n from notes where status = 'published' group by topic");
    return Object.fromEntries(res.rows.map((r) => [String(r.topic), Number(r.n)])) as Record<string, number>;
  } catch {
    return {};
  }
}

export async function saveNote(input: { id?: number; slug: string; title: string; topic: string; body: string; format: Note["format"]; status: Note["status"] }) {
  const c = await db();
  const now = new Date().toISOString();
  if (input.id) {
    const before = await noteById(input.id);
    if (!before) throw new Error("Note not found");
    // Published once, the date stays: editing later doesn't move it to the top.
    const publishedAt = input.status === "published" ? before.publishedAt ?? now : null;
    await c.execute({
      sql: "update notes set slug = ?, title = ?, topic = ?, body = ?, format = ?, status = ?, updated_at = ?, published_at = ? where id = ?",
      args: [input.slug, input.title, input.topic, input.body, input.format, input.status, now, publishedAt, input.id],
    });
    return input.id;
  }
  const res = await c.execute({
    sql: "insert into notes (slug, title, topic, body, format, status, created_at, updated_at, published_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    args: [input.slug, input.title, input.topic, input.body, input.format, input.status, now, now, input.status === "published" ? now : null],
  });
  return Number(res.lastInsertRowid);
}

export async function deleteNote(id: number) {
  await (await db()).execute({ sql: "delete from notes where id = ?", args: [id] });
}
