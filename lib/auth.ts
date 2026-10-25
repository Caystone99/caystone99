import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// One writer: you. /write asks for WRITE_PASSWORD and keeps you signed in with a signed, httpOnly cookie.
const COOKIE = "notes_session";
const WEEK = 7 * 24 * 3600;

const secret = () => process.env.SESSION_SECRET || process.env.WRITE_PASSWORD || "";
const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const writingEnabled = () => !!process.env.WRITE_PASSWORD;

export function passwordMatches(input: string) {
  const expected = process.env.WRITE_PASSWORD;
  return !!expected && same(sign(input), sign(expected));
}

export async function signIn() {
  const expires = Math.floor(Date.now() / 1000) + WEEK;
  (await cookies()).set(COOKIE, `${expires}.${sign(`writer.${expires}`)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: WEEK,
  });
}

export async function signOut() {
  (await cookies()).delete(COOKIE);
}

export async function isWriter() {
  if (!writingEnabled()) return false;
  const value = (await cookies()).get(COOKIE)?.value ?? "";
  const [expires, mac] = value.split(".");
  if (!expires || !mac || Number(expires) < Date.now() / 1000) return false;
  return same(mac, sign(`writer.${expires}`));
}
