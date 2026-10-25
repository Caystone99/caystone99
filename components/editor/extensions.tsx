"use client";

import { Extension, Node, type Editor } from "@tiptap/core";
import type { DOMOutputSpec } from "@tiptap/pm/model";
import { NodeSelection, Selection, type Transaction } from "@tiptap/pm/state";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import type { IconName } from "./icons";

// The blocks you can add from the "/" menu, the + beside a block, or turn a block into from the toolbar.
export type EditorActions = { pickMedia: () => void; askYoutube: () => void };
export type Block = {
  key: string; label: string; hint: string; icon: IconName; keywords?: string;
  // Blocks that change the current block (rather than add one) can be used to "turn into".
  convert?: boolean;
  run: (editor: Editor, actions: EditorActions) => void;
  active?: (editor: Editor) => boolean;
};

// When a whole block is selected (a photo, say), something inserted goes below it rather than replacing it.
export const afterSelectedBlock = ({ tr }: { tr: Transaction }) => {
  if (tr.selection instanceof NodeSelection) tr.setSelection(Selection.near(tr.doc.resolve(tr.selection.to)));
  return true;
};

export const blocks: Block[] = [
  { key: "text", label: "Text", hint: "Plain paragraph", icon: "text", keywords: "paragraph p", convert: true,
    run: (e) => e.chain().focus().clearNodes().setParagraph().run(), active: (e) => e.isActive("paragraph") && !e.isActive("bulletList") && !e.isActive("orderedList") && !e.isActive("taskList") && !e.isActive("blockquote") && !e.isActive("callout") },
  { key: "h2", label: "Heading", hint: "Section title", icon: "h2", keywords: "h2 title", convert: true,
    run: (e) => e.chain().focus().clearNodes().setHeading({ level: 2 }).run(), active: (e) => e.isActive("heading", { level: 2 }) },
  { key: "h3", label: "Subheading", hint: "Smaller title", icon: "h3", keywords: "h3", convert: true,
    run: (e) => e.chain().focus().clearNodes().setHeading({ level: 3 }).run(), active: (e) => e.isActive("heading", { level: 3 }) },
  { key: "bullet", label: "Bulleted list", hint: "Points in any order", icon: "bullet", keywords: "ul unordered", convert: true,
    run: (e) => e.chain().focus().clearNodes().toggleBulletList().run(), active: (e) => e.isActive("bulletList") },
  { key: "ordered", label: "Numbered list", hint: "Steps in order", icon: "ordered", keywords: "ol 1", convert: true,
    run: (e) => e.chain().focus().clearNodes().toggleOrderedList().run(), active: (e) => e.isActive("orderedList") },
  { key: "task", label: "Checklist", hint: "Things to do or done", icon: "task", keywords: "todo checkbox", convert: true,
    run: (e) => e.chain().focus().clearNodes().toggleTaskList().run(), active: (e) => e.isActive("taskList") },
  { key: "quote", label: "Quote", hint: "Pull a line out", icon: "quote", keywords: "blockquote", convert: true,
    run: (e) => e.chain().focus().clearNodes().toggleBlockquote().run(), active: (e) => e.isActive("blockquote") },
  { key: "callout", label: "Callout", hint: "A boxed aside", icon: "callout", keywords: "note aside info", convert: true,
    run: (e) => e.chain().focus().clearNodes().wrapIn("callout").run(), active: (e) => e.isActive("callout") },
  { key: "code", label: "Code", hint: "Monospaced block", icon: "code", keywords: "pre snippet", convert: true,
    run: (e) => e.chain().focus().clearNodes().toggleCodeBlock().run(), active: (e) => e.isActive("codeBlock") },
  { key: "divider", label: "Divider", hint: "A line across", icon: "divider", keywords: "hr rule separator",
    run: (e) => e.chain().focus().command(afterSelectedBlock).setHorizontalRule().run() },
  { key: "media", label: "Photo or video", hint: "Upload from your computer", icon: "media", keywords: "image picture upload footage",
    run: (_, a) => a.pickMedia() },
  { key: "youtube", label: "YouTube", hint: "Embed a video by link", icon: "video", keywords: "embed video",
    run: (_, a) => a.askYoutube() },
];

export function findBlocks(query: string) {
  const q = query.toLowerCase().trim();
  if (!q) return blocks;
  return blocks.filter((b) => `${b.label} ${b.keywords ?? ""}`.toLowerCase().split(/\s+/).some((w) => w.startsWith(q)) || b.label.toLowerCase().includes(q));
}

// A photo or video with an optional caption, written out the same way Markdown notes are, so both look alike.
function MediaView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const { src, kind, caption } = node.attrs as { src: string; kind: "image" | "video"; caption: string };
  return (
    <NodeViewWrapper as="figure" className={`note-media${selected ? " is-selected" : ""}`} data-drag-handle="">
      {kind === "video" ? <video src={src} controls playsInline preload="metadata" /> : <img src={src} alt={caption} />}
      <input className="media-caption" value={caption} placeholder="Add a caption" aria-label="Caption"
        onChange={(e) => updateAttributes({ caption: e.target.value })} />
    </NodeViewWrapper>
  );
}

export const Media = Node.create({
  name: "media",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return { src: { default: null }, kind: { default: "image" }, caption: { default: "" } };
  },
  parseHTML() {
    const read = (el: HTMLElement) => ({ src: el.getAttribute("src"), kind: el.tagName === "VIDEO" ? "video" : "image" });
    return [
      {
        tag: "figure.note-media", priority: 60,
        getAttrs: (el) => {
          const m = el.querySelector<HTMLElement>("img, video");
          return m ? { ...read(m), caption: el.querySelector("figcaption")?.textContent ?? "" } : false;
        },
      },
      { tag: "img[src]", getAttrs: (el) => ({ ...read(el), caption: el.getAttribute("alt") ?? "" }) },
      { tag: "video[src]", getAttrs: (el) => read(el) },
    ];
  },
  renderHTML({ node }) {
    const { src, kind, caption } = node.attrs;
    const media: DOMOutputSpec = kind === "video" ? ["video", { src, controls: "", playsinline: "", preload: "metadata" }] : ["img", { src, alt: caption, loading: "lazy" }];
    return caption ? ["figure", { class: "note-media" }, media, ["figcaption", {}, caption]] : ["figure", { class: "note-media" }, media];
  },
  addNodeView() {
    return ReactNodeViewRenderer(MediaView);
  },
});

// A boxed aside that holds any other blocks.
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  parseHTML: () => [{ tag: "aside[data-callout]" }],
  renderHTML: () => ["aside", { "data-callout": "" }, 0],
});

// Typing "/" opens the block menu. The menu itself is drawn by the editor component, through `render`.
export const SlashCommand = Extension.create<{ render: SuggestionOptions<Block>["render"]; actions: () => EditorActions }>({
  name: "slashCommand",
  addOptions() {
    return { render: undefined, actions: () => ({ pickMedia() {}, askYoutube() {} }) };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion<Block>({
        editor: this.editor,
        char: "/",
        allow: ({ state, range }) => state.doc.resolve(range.from).parent.type.name !== "codeBlock",
        items: ({ query }) => findBlocks(query),
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run();
          props.run(editor, this.options.actions());
        },
        render: this.options.render,
      }),
    ];
  },
});
