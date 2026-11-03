import "server-only";
import { toHtml } from "hast-util-to-html";
import katex from "katex";
import sanitizeHtml from "sanitize-html";
import { languageLabel, lowlight } from "./code";
import type { Note } from "./db";
import { graphSvg, readGraph } from "./graph";
import { renderMarkdown } from "./markdown";

// The editor saves HTML. Before it's shown, everything outside what the editor makes is dropped: no scripts,
// styles or event handlers, links only to web, mail or this site, and embeds only from YouTube. Equations, graphs
// and code are stored as their source and drawn after that (see `draw`), so what's drawn never meets the sanitiser.
const options: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "h2", "h3", "strong", "em", "u", "s", "sub", "sup", "code", "mark", "a", "blockquote", "pre", "hr",
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
    div: ["data-youtube-video", "data-math"],
    span: ["data-math"],
    aside: ["data-callout"],
    figure: ["class", "data-graph"],
    pre: ["data-title"],
    code: ["class"],
  },
  allowedClasses: { figure: ["note-media", "note-graph"], code: ["language-*"] },
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

const decode = (s: string) => s.replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);/gi, (_, e: string) => {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0" };
  if (e[0] !== "#") return named[e.toLowerCase()];
  return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
});
const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function math(latex: string, display: boolean) {
  try {
    return katex.renderToString(latex, { displayMode: display, throwOnError: true, strict: false, output: "htmlAndMathml" });
  } catch {
    // Shown as written rather than not at all.
    return `<code class="math-bad">${escape(latex)}</code>`;
  }
}

function code(source: string, language: string | undefined, title: string | undefined) {
  let body = escape(source);
  try {
    if (language && lowlight.registered(language)) body = toHtml(lowlight.highlight(language, source));
  } catch {}
  const name = title || (language ? languageLabel(language) : "");
  return `<div class="code-cell"><div class="code-cell-head"><span class="code-cell-name">${escape(name)}</span><button type="button" class="code-copy" data-copy="">Copy</button></div>`
    + `<pre><code class="hljs${language ? ` language-${escape(language)}` : ""}">${body}</code></pre></div>`;
}

// The sanitised note's equations typeset, graphs drawn and code highlighted. The sanitiser writes these out in a
// fixed form, which is what's matched here.
function draw(html: string) {
  return html
    .replace(/<(div|span) data-math="(block|inline)">([\s\S]*?)<\/\1>/g, (_, tag, kind, latex) =>
      `<${tag} class="math-${kind}">${math(decode(latex), kind === "block")}</${tag}>`)
    .replace(/<figure class="note-graph" data-graph="([^"]*)">([\s\S]*?)<\/figure>/g, (_, data, rest) => {
      let graph;
      try { graph = readGraph(JSON.parse(decode(data))); } catch { return ""; }
      return `<figure class="note-graph">${graphSvg(graph)}${rest}</figure>`;
    })
    .replace(/<pre(?: data-title="([^"]*)")?><code(?: class="language-([\w+#.-]+)")?>([\s\S]*?)<\/code><\/pre>/g, (_, title, language, source) =>
      code(decode(source), language, title && decode(title)));
}

export function noteHtml(note: Pick<Note, "body" | "format">) {
  return draw(note.format === "html" ? sanitizeHtml(note.body, options) : renderMarkdown(note.body));
}
