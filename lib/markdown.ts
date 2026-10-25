import { Marked } from "marked";

// Notes are written in Markdown. Images whose address ends in a video extension become players, so the same
// ![caption](url) works for photos and footage. Raw HTML is shown as text, never run.
const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const safe = (href: string) => (/^(https?:|\/|#|mailto:)/i.test(href) ? href : "#");

const md = new Marked({
  gfm: true,
  renderer: {
    html({ text }) { return escape(text); },
    image({ href, title, text }) {
      const src = escape(safe(href));
      const caption = text || title ? `<figcaption>${escape(text || title || "")}</figcaption>` : "";
      if (/\.(mp4|webm|mov)(\?|$)/i.test(href)) return `<figure class="note-media"><video src="${src}" controls playsinline preload="metadata"></video>${caption}</figure>`;
      return `<figure class="note-media"><img src="${src}" alt="${escape(text)}" loading="lazy" />${caption}</figure>`;
    },
    link({ href, title, tokens }) {
      const inner = this.parser.parseInline(tokens);
      const external = /^https?:/i.test(href);
      return `<a href="${escape(safe(href))}"${title ? ` title="${escape(title)}"` : ""}${external ? ' target="_blank" rel="noopener"' : ""}>${inner}</a>`;
    },
  },
});

export const renderMarkdown = (body: string) => md.parse(body, { async: false }) as string;

const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " };

// A note's words without formatting, whichever way it was written: for excerpts and reading time.
export function noteText(note: { body: string; format: "markdown" | "html" }) {
  const text = note.format === "html"
    ? note.body.replace(/<figcaption>.*?<\/figcaption>/g, " ").replace(/<[^>]+>/g, " ").replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e) => entities[e])
    : note.body.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[#>*_`~-]/g, "");
  return text.replace(/\s+/g, " ").trim();
}

// A short excerpt of plain text (from noteText) for lists and link previews.
export function excerpt(text: string, length = 180) {
  return text.length > length ? `${text.slice(0, length).replace(/\s+\S*$/, "")}…` : text;
}

export const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

export function readingMinutes(text: string) {
  return Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 220));
}
