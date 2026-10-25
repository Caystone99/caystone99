import type { Metadata } from "next";
import Link from "next/link";
import Activity from "@/components/Activity";
import NoteList from "@/components/NoteList";
import Shell from "@/components/Shell";
import { topicTitle, topics } from "@/lib/content";
import { publishedNotes } from "@/lib/db";

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

  return (
    <Shell>
      <section className="notes-head">
        <p className="label">Notes</p>
        <h1 className="h1">{topic ? topicTitle(topic) : "What I'm working on, as I work on it."}</h1>
        <p className="intro">Progress, dead ends and what I&apos;m reading. Written as I go, so the gaps show too.</p>
        <Activity notes={all} />
      </section>

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
