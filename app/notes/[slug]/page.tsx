import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Shell from "@/components/Shell";
import { topicTitle } from "@/lib/content";
import { noteBySlug, publishedNotes } from "@/lib/db";
import { excerpt, noteText, readingMinutes } from "@/lib/markdown";
import { noteHtml } from "@/lib/render";

export const dynamic = "force-dynamic";

const fmt = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Porto-Novo" }).format(new Date(iso));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const note = await noteBySlug((await params).slug).catch(() => null);
  if (!note) return { title: "Note not found" };
  return { title: `${note.title} · Notes`, description: excerpt(noteText(note), 160), openGraph: { title: note.title, description: excerpt(noteText(note), 160), type: "article" } };
}

export default async function NotePage({ params }: { params: Promise<{ slug: string }> }) {
  const note = await noteBySlug((await params).slug).catch(() => null);
  if (!note) notFound();
  // The notes either side of this one, by date, for reading on.
  const all = await publishedNotes({ topic: note.topic });
  const i = all.findIndex((n) => n.id === note.id);
  const newer = i > 0 ? all[i - 1] : null, older = i >= 0 && i < all.length - 1 ? all[i + 1] : null;

  return (
    <Shell>
      <article className="note">
        <Link href="/notes" className="note-back">← Notes</Link>
        <header className="note-head">
          <p className="card-meta">
            <span>{fmt(note.publishedAt!)}</span>
            <Link href={`/notes?topic=${note.topic}`}>{topicTitle(note.topic)}</Link>
            <span>{readingMinutes(noteText(note))} min read</span>
          </p>
          <h1 className="note-title">{note.title}</h1>
        </header>
        <div className="prose" dangerouslySetInnerHTML={{ __html: noteHtml(note) }} />
        {(newer || older) && (
          <nav className="note-pager" aria-label={`More on ${topicTitle(note.topic)}`}>
            {older ? <Link href={`/notes/${older.slug}`}><span className="label">Before</span>{older.title}</Link> : <span />}
            {newer ? <Link href={`/notes/${newer.slug}`} className="next"><span className="label">After</span>{newer.title}</Link> : <span />}
          </nav>
        )}
      </article>
    </Shell>
  );
}
