import "server-only";
import { AwsClient } from "aws4fetch";

// Photos and video for notes go to a Cloudflare R2 bucket. The browser uploads straight to R2 with a
// short-lived signed URL, so large files never pass through the site's server.
const env = () => ({
  account: process.env.R2_ACCOUNT_ID, key: process.env.R2_ACCESS_KEY_ID, secret: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET, publicUrl: process.env.R2_PUBLIC_URL?.replace(/\/$/, ""),
});

export const uploadsEnabled = () => Object.values(env()).every(Boolean);

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif",
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
};
export const MAX_BYTES = 200 * 1024 * 1024;

export async function signUpload(name: string, type: string, size: number) {
  const e = env();
  if (!uploadsEnabled()) throw new Error("Uploads aren't set up yet: add the R2 settings");
  const ext = TYPES[type];
  if (!ext) throw new Error("Images (JPEG, PNG, WebP, GIF, AVIF) and video (MP4, WebM, MOV) only");
  if (size > MAX_BYTES) throw new Error("Files up to 200 MB");
  const base = name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "file";
  const now = new Date();
  const key = `notes/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${base}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const client = new AwsClient({ accessKeyId: e.key!, secretAccessKey: e.secret!, service: "s3", region: "auto" });
  const target = new URL(`https://${e.account}.r2.cloudflarestorage.com/${e.bucket}/${key}`);
  target.searchParams.set("X-Amz-Expires", "600");
  const signed = await client.sign(new Request(target, { method: "PUT", headers: { "content-type": type } }), { aws: { signQuery: true } });
  return { uploadUrl: signed.url, publicUrl: `${e.publicUrl}/${key}`, kind: type.startsWith("video/") ? "video" : "image" };
}
