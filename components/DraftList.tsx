import Link from "next/link";
import { topicTitle } from "@/lib/content";
import type { Note } from "@/lib/db";
import { excerpt, noteText } from "@/lib/markdown";

const fmt = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Porto-Novo" }).format(new Date(iso));

// Drafts as index rows, newest edit first, each opening in the editor where it was left.
export default function DraftList({ notes }: { notes: Note[] }) {
  return (
    <ol className="built notes-list">
      {notes.map((n) => (
        <li key={n.id}>
          <Link href={`/write/${n.id}`} className="built-row">
            <span className="built-no">{fmt(n.updatedAt)}</span>
            <span className="built-name">{n.title}<span className="built-for">{topicTitle(n.topic)}</span></span>
            <span className="built-what">{excerpt(noteText(n)) || <span className="status status-work">Draft</span>}</span>
            <span className="built-host">Resume<span className="built-arrow" aria-hidden="true">→</span></span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
