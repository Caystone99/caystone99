import "server-only";
import sanitizeHtml from "sanitize-html";
import type { Note } from "./db";
import { renderMarkdown } from "./markdown";

// The editor saves HTML. Before it's shown, everything outside what the editor makes is dropped: no scripts,
// styles or event handlers, links only to web, mail or this site, and embeds only from YouTube.
const options: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "h2", "h3", "strong", "em", "u", "s", "code", "mark", "a", "blockquote", "pre", "hr",
    "ul", "ol", "li", "label", "input", "div", "span", "aside", "figure", "figcaption", "img", "video", "iframe",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "loading"],
    video: ["src", "controls", "playsinline", "preload"],
    iframe: ["src", "width", "height", "allowfullscreen", "allow", "loading", "title"],
    ol: ["start"],
    ul: ["data-type"],
    li: ["data-type", "data-checked"],
    input: ["type", "checked", "disabled"],
    div: ["data-youtube-video"],
    aside: ["data-callout"],
    figure: ["class"],
    code: ["class"],
  },
  allowedClasses: { figure: ["note-media"], code: ["language-*"] },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["https"], video: ["https"] },
  allowedIframeHostnames: ["www.youtube-nocookie.com", "www.youtube.com"],
  transformTags: {
    a: (tag, attribs) => {
      const external = /^https?:/i.test(attribs.href ?? "");
      return { tagName: tag, attribs: { href: attribs.href ?? "#", ...(external ? { target: "_blank", rel: "noopener" } : {}) } };
    },
    // Checklists are read, not ticked, on the site.
    input: (tag, attribs) => ({ tagName: tag, attribs: { type: "checkbox", disabled: "", ...(attribs.checked !== undefined ? { checked: "" } : {}) } }),
    img: (tag, attribs) => ({ tagName: tag, attribs: { ...attribs, loading: "lazy" } }),
    iframe: (tag, attribs) => ({ tagName: tag, attribs: { ...attribs, loading: "lazy", title: "YouTube video", allowfullscreen: "" } }),
  },
};

export function noteHtml(note: Pick<Note, "body" | "format">) {
  return note.format === "html" ? sanitizeHtml(note.body, options) : renderMarkdown(note.body);
}
