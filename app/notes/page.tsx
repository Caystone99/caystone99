import type { Metadata } from "next";
import Link from "next/link";
import Activity from "@/components/Activity";
import DraftList from "@/components/DraftList";
import NoteList from "@/components/NoteList";
import Shell from "@/components/Shell";
import { topicTitle, topics } from "@/lib/content";
import { isWriter } from "@/lib/auth";
import { allNotes, publishedNotes } from "@/lib/db";

export const metadata: Metadata = {
  title: "Notes · Caleb-Livingstone Emmanuel",
  description: "Working notes on robotics, reinforcement learning, material science and Khrona: what I'm building, and how it's going.",
};
export const dynamic = "force-dynamic";

export default async function Notes({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams;
  const all = await publishedNotes().catch(() => []);
  const notes = topic ? all.filter((n) => n.topic === topic) : all;
  const used = topics.filter((t) => all.some((n) => n.topic === t.key));
  // Signed in, your drafts are here too, to pick one up again. Nobody else sees them.
  const drafts = (await isWriter())
    ? (await allNotes().catch(() => [])).filter((n) => n.status === "draft" && (!topic || n.topic === topic)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    : null;

  return (
    <Shell>
      <section className="notes-head">
        <p className="label">Notes</p>
        <h1 className="h1">{topic ? topicTitle(topic) : "What I'm working on, as I work on it."}</h1>
        <p className="intro">Progress, dead ends and what I&apos;m reading. Written as I go, so the gaps show too.</p>
        <Activity notes={all} />
      </section>

      {drafts && (
        <section className="section notes-section drafts">
          <div className="section-head">
            <h2 className="label">Your drafts <span className="drafts-count">{drafts.length}</span></h2>
            <span className="inline">
              <Link href="/write" className="btn btn-ghost btn-sm">All your notes</Link>
              <Link href="/write/new" className="btn btn-sm">New note</Link>
            </span>
          </div>
          {drafts.length ? <DraftList notes={drafts} /> : <p className="empty">No drafts{topic ? ` in ${topicTitle(topic)}` : ""}. Everything is published.</p>}
        </section>
      )}

      {used.length > 1 && (
        <nav className="filters" aria-label="Topics">
          <Link href="/notes" aria-current={!topic ? "page" : undefined} className="filter-link">All <span>{all.length}</span></Link>
          {used.map((t) => (
            <Link key={t.key} href={`/notes?topic=${t.key}`} aria-current={topic === t.key ? "page" : undefined} className="filter-link">
              {t.title} <span>{all.filter((n) => n.topic === t.key).length}</span>
            </Link>
          ))}
        </nav>
      )}

      <section className="section notes-section">
        {notes.length ? <NoteList notes={notes} /> : <p className="empty">Nothing here yet.</p>}
      </section>
    </Shell>
  );
}
