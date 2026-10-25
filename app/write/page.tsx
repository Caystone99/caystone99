import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "@/components/LoginForm";
import Shell from "@/components/Shell";
import { isWriter, writingEnabled } from "@/lib/auth";
import { topicTitle } from "@/lib/content";
import { allNotes } from "@/lib/db";
import { logout } from "./actions";

export const metadata: Metadata = { title: "Write", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const fmt = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Porto-Novo" }).format(new Date(iso));

export default async function Write() {
  if (!writingEnabled()) {
    return <Shell><section className="notes-head"><h1 className="h1">Writing is off.</h1><p className="intro">Set WRITE_PASSWORD (and SESSION_SECRET) to switch it on.</p></section></Shell>;
  }
  if (!(await isWriter())) {
    return <Shell><section className="notes-head"><p className="label">Write</p><h1 className="h1">Sign in to write.</h1><LoginForm /></section></Shell>;
  }
  const notes = await allNotes();
  return (
    <Shell>
      <section className="notes-head">
        <div className="section-head">
          <h1 className="h1">Your notes</h1>
          <span className="inline">
            <Link href="/write/new" className="btn">New note</Link>
            <form action={logout}><button className="btn btn-ghost">Sign out</button></form>
          </span>
        </div>
      </section>
      <section className="section notes-section">
        {notes.length === 0 ? <p className="empty">No notes yet. Start with what you did today.</p> : (
          <ol className="built notes-list">
            {notes.map((n) => (
              <li key={n.id}>
                <Link href={`/write/${n.id}`} className="built-row">
                  <span className="built-no">{fmt(n.publishedAt ?? n.updatedAt)}</span>
                  <span className="built-name">{n.title}<span className="built-for">{topicTitle(n.topic)}</span></span>
                  <span className="built-what"><span className={`status status-${n.status === "published" ? "go" : "work"}`}>{n.status === "published" ? "Published" : "Draft"}</span></span>
                  <span className="built-host">Edit<span className="built-arrow" aria-hidden="true">→</span></span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </Shell>
  );
}
