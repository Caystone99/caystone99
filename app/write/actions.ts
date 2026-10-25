"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isWriter, passwordMatches, signIn, signOut } from "@/lib/auth";
import { topics } from "@/lib/content";
import { deleteNote, noteById, saveNote } from "@/lib/db";
import { noteText, slugify } from "@/lib/markdown";
import { signUpload } from "@/lib/r2";

export type LoginState = { error?: string } | null;

// A small pause on every wrong password makes guessing slow.
export async function login(_: LoginState, fd: FormData): Promise<LoginState> {
  if (!passwordMatches(String(fd.get("password") ?? ""))) {
    await new Promise((r) => setTimeout(r, 1200));
    return { error: "That's not it." };
  }
  await signIn();
  redirect("/write");
}

export async function logout() {
  await signOut();
  redirect("/");
}

async function guard() {
  if (!(await isWriter())) throw new Error("Sign in again");
}

function refresh(slug?: string) {
  revalidatePath("/");
  revalidatePath("/notes");
  if (slug) revalidatePath(`/notes/${slug}`);
}

export type SaveResult = { ok: true; id: number; slug: string; status: "draft" | "published" } | { ok: false; error: string };

export async function save(input: { id?: number; title: string; slug: string; topic: string; body: string; status: "draft" | "published" }): Promise<SaveResult> {
  try {
    await guard();
    const title = input.title.trim();
    if (!title) return { ok: false, error: "Give it a title" };
    const slug = slugify(input.slug || title);
    if (!slug) return { ok: false, error: "The address needs letters or numbers" };
    if (!topics.some((t) => t.key === input.topic)) return { ok: false, error: "Pick a topic" };
    if (input.status === "published" && !noteText({ body: input.body, format: "html" }) && !/<(img|video|iframe)\b/.test(input.body)) return { ok: false, error: "Write something before publishing" };
    const before = input.id ? await noteById(input.id) : null;
    const id = await saveNote({ ...input, title, slug, format: "html" });
    refresh(slug);
    if (before && before.slug !== slug) refresh(before.slug);
    return { ok: true, id, slug, status: input.status };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: /UNIQUE/i.test(message) ? "Another note already uses that address" : message };
  }
}

export async function remove(id: number) {
  await guard();
  const note = await noteById(id);
  await deleteNote(id);
  refresh(note?.slug);
  redirect("/write");
}

export async function presign(name: string, type: string, size: number) {
  try {
    await guard();
    return { ok: true as const, ...(await signUpload(name, type, size)) };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}
