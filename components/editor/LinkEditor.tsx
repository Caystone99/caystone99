"use client";

import type { Editor } from "@tiptap/core";
import { useState } from "react";
import { Icon } from "./icons";

export type LinkTarget = { from: number; to: number; href: string; text: string; left: number; top: number };
export type NoteLink = { title: string; slug: string };
type Choice = { href: string; label: string; hint: string; title?: string };

// What was typed, as an address: web addresses get https://, email addresses mailto:, and paths on this site
// stay as they are.
export function linkHref(value: string) {
  const v = value.trim();
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(v)) return v;
  if (/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(v)) return `mailto:${v}`;
  return `https://${v}`;
}

// Adding or changing a link, beside the text it's on. Type an address, or a few letters of one of your notes'
// titles to link to it. The text can be changed here too, or written here when nothing was selected.
export default function LinkEditor({ editor, target, notes, onClose }: { editor: Editor; target: LinkTarget; notes: NoteLink[]; onClose: () => void }) {
  const [href, setHref] = useState(target.href);
  const [text, setText] = useState(target.text);
  const [active, setActive] = useState(0);
  const q = href.trim();
  const choices: Choice[] = [
    ...(q ? [{ href: linkHref(q), label: linkHref(q).replace(/^(https:\/\/|mailto:)/, ""), hint: /^mailto:/.test(linkHref(q)) ? "Email" : /^[/#]/.test(q) ? "This site" : "Web" }] : []),
    ...notes.filter((n) => !q || n.title.toLowerCase().includes(q.toLowerCase()) || n.slug.includes(q.toLowerCase()))
      .slice(0, 5).map((n) => ({ href: `/notes/${n.slug}`, label: n.title, hint: "Note", title: n.title })),
  ];

  function close() {
    onClose();
    editor.commands.focus();
  }

  function apply(choice: Choice | undefined) {
    const to = choice?.href ?? (q ? linkHref(q) : "");
    if (!to) return remove();
    const label = text.trim() || choice?.title || to.replace(/^(https?:\/\/|mailto:)/, "");
    const range = { from: target.from, to: target.to };
    const chain = editor.chain().focus();
    // New or changed words are written in; otherwise the link goes on the selected text, keeping its formatting.
    if (target.from === target.to || label !== target.text) chain.insertContentAt(range, { type: "text", text: label, marks: [{ type: "link", attrs: { href: to } }] });
    else chain.setTextSelection(range).setLink({ href: to }).setTextSelection(range.to);
    // Whatever's typed next starts outside the link.
    chain.unsetMark("link").run();
    onClose();
  }

  function remove() {
    editor.chain().focus().setTextSelection({ from: target.from, to: target.to }).unsetLink().setTextSelection(target.to).run();
    onClose();
  }

  return (
    // Two fields and no submit button, so Enter is handled here rather than by the form.
    <form className="link-editor" style={{ left: target.left, top: target.top }} role="dialog" aria-label="Link"
      onSubmit={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === "Escape") { e.preventDefault(); close(); }
        if (e.key === "Enter" && !e.nativeEvent.isComposing && e.target instanceof HTMLInputElement) { e.preventDefault(); apply(choices[active]); }
      }}>
      <label className="link-row">
        <Icon name="link" />
        <input className="input" autoFocus value={href} placeholder="Paste a link, or search your notes" aria-label="Address"
          onChange={(e) => { setHref(e.target.value); setActive(0); }}
          onKeyDown={(e) => {
            if (!choices.length) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((active + 1) % choices.length); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((active - 1 + choices.length) % choices.length); }
          }} />
      </label>
      <label className="link-row">
        <Icon name="text" />
        <input className="input" value={text} placeholder="Text to show" aria-label="Text" onChange={(e) => setText(e.target.value)} />
      </label>
      {choices.length > 0 && (
        <div className="link-choices" role="listbox" aria-label="Suggestions">
          {choices.map((c, i) => (
            <button key={c.href} type="button" role="option" aria-selected={i === active} className={`slash-item${i === active ? " is-active" : ""}`}
              onMouseEnter={() => setActive(i)} onClick={() => apply(c)}>
              <span className="link-choice">{c.label}</span><span className="slash-hint">{c.hint}</span>
            </button>
          ))}
        </div>
      )}
      <div className="link-actions">
        {target.href && <a className="btn-link" href={target.href} target="_blank" rel="noopener">Open<Icon name="external" /></a>}
        {target.href && <button type="button" className="btn-link danger" onClick={remove}>Remove link</button>}
        <span className="link-keys">↵ to apply · esc to close</span>
      </div>
    </form>
  );
}

// Over a link the cursor is in: where it goes, and ways to open, change, copy or remove it.
export function LinkPeek({ editor, onEdit }: { editor: Editor; onEdit: () => void }) {
  const href = (editor.getAttributes("link").href as string | undefined) ?? "";
  const [copied, setCopied] = useState(false);
  return (
    <>
      <a className="link-peek" href={href} target="_blank" rel="noopener" title={href}>{href.replace(/^(https?:\/\/|mailto:)/, "")}</a>
      <button type="button" className="tool" aria-label="Edit link" title="Edit link ⌘K" onMouseDown={(e) => e.preventDefault()} onClick={onEdit}><Icon name="edit" /></button>
      <button type="button" className="tool" aria-label="Copy link" title={copied ? "Copied" : "Copy link"} onMouseDown={(e) => e.preventDefault()}
        onClick={() => { void navigator.clipboard.writeText(href.startsWith("/") ? location.origin + href : href); setCopied(true); setTimeout(() => setCopied(false), 1400); }}>
        <Icon name={copied ? "check" : "copy"} />
      </button>
      <button type="button" className="tool" aria-label="Remove link" title="Remove link" onMouseDown={(e) => e.preventDefault()}
        onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}>
        <Icon name="unlink" />
      </button>
    </>
  );
}
