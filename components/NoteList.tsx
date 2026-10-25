import Link from "next/link";
import { topicTitle } from "@/lib/content";
import type { Note } from "@/lib/db";
import { excerpt, noteText } from "@/lib/markdown";

const fmt = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Porto-Novo" }).format(new Date(iso));

// Notes as index rows, in the same style as Work.
export default function NoteList({ notes }: { notes: Note[] }) {
  return (
    <ol className="built notes-list">
      {notes.map((n) => (
        <li key={n.id}>
          <Link href={`/notes/${n.slug}`} className="built-row">
            <span className="built-no">{fmt(n.publishedAt!)}</span>
            <span className="built-name">{n.title}<span className="built-for">{topicTitle(n.topic)}</span></span>
            <span className="built-what">{excerpt(noteText(n))}</span>
            <span className="built-host">Read<span className="built-arrow" aria-hidden="true">→</span></span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
