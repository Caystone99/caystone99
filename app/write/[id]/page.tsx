import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import NoteEditor from "@/components/NoteEditor";
import Shell from "@/components/Shell";
import { isWriter } from "@/lib/auth";
import { topics } from "@/lib/content";
import { noteById } from "@/lib/db";
import { uploadsEnabled } from "@/lib/r2";

export const metadata: Metadata = { title: "Write", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Edit({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isWriter())) redirect("/write");
  const { id } = await params;
  const note = id === "new" ? null : await noteById(Number(id));
  if (id !== "new" && !note) notFound();
  return (
    <Shell>
      <Link href="/write" className="note-back">← Your notes</Link>
      <NoteEditor key={note?.id ?? "new"} note={note} topics={topics} uploads={uploadsEnabled()} />
    </Shell>
  );
}
