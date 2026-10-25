"use client";

import type { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import Highlight from "@tiptap/extension-highlight";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Youtube from "@tiptap/extension-youtube";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import type { SuggestionProps } from "@tiptap/suggestion";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { presign, remove, save } from "@/app/write/actions";
import type { Note } from "@/lib/db";
import { renderMarkdown, slugify } from "@/lib/markdown";
import Dropdown from "./Dropdown";
import BlockHandle from "./editor/BlockHandle";
import { afterSelectedBlock, blocks, Callout, Media, SlashCommand, type Block, type EditorActions } from "./editor/extensions";
import { Icon, type IconName } from "./editor/icons";

type Props = { note: Note | null; topics: { key: string; title: string }[]; uploads: boolean };
type Slash = { items: Block[]; index: number; left: number; top: number; pick: (b: Block) => void };
type Prompt = { kind: "link" | "youtube"; value: string };

// Write on the page as it will look. Select text to format it, type "/" (or press + beside a block) to add
// headings, lists, callouts, code, photos and video, and drag a block's grip to move it. Cmd/Ctrl+S saves.
// Photos and video upload straight to the bucket; drop or paste them in, too.
export default function NoteEditor({ note, topics, uploads }: Props) {
  const router = useRouter();
  const [id, setId] = useState(note?.id);
  const [title, setTitle] = useState(note?.title ?? "");
  const [slug, setSlug] = useState(note?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(!!note);
  const [topic, setTopic] = useState(note?.topic ?? topics[0].key);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"draft" | "published">(note?.status ?? "draft");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [upload, setUpload] = useState<{ name: string; percent: number } | null>(null);
  const [slash, setSlash] = useState<Slash | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [pending, start] = useTransition();
  const file = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const slashRef = useRef<Slash | null>(null);
  slashRef.current = slash;
  // What was last saved, to know whether leaving would lose anything. Set once the editor has read the note.
  const saved = useRef({ body: "", title: note?.title ?? "" });
  const dirty = body !== saved.current.body || title !== saved.current.title;

  const actions = useRef<EditorActions>({
    pickMedia: () => (uploads ? file.current?.click() : setMessage({ tone: "error", text: "Uploads switch on once the R2 bucket is set up" })),
    askYoutube: () => setPrompt({ kind: "youtube", value: "" }),
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
        dropcursor: { color: "var(--accent)", width: 2 },
      }),
      Placeholder.configure({ placeholder: ({ node }) => (node.type.name === "heading" ? "Heading" : "Write, or type / for blocks") }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Youtube.configure({ nocookie: true, modestBranding: true, width: 640, height: 360 }),
      Media,
      Callout,
      SlashCommand.configure({ actions: () => actions.current, render: slashMenu(setSlash, slashRef) }),
    ],
    // Older notes were written in Markdown; they open here as formatted text and are saved in the new form.
    content: note ? (note.format === "html" ? note.body : renderMarkdown(note.body)) : "",
    editorProps: {
      attributes: { class: "prose editor-doc", "aria-label": "Note" },
      handleDrop: (view, event, _slice, moved) => {
        const files = event.dataTransfer?.files;
        if (moved || !files?.length) return false;
        event.preventDefault();
        const at = view.posAtCoords({ left: event.clientX, top: event.clientY });
        // Uploads land where they were dropped.
        if (at) view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(at.pos))));
        void onFiles(files);
        return true;
      },
      handlePaste: (_view, event) => {
        const files = event.clipboardData?.files;
        if (!files?.length) return false;
        event.preventDefault();
        void onFiles(files);
        return true;
      },
    },
    onCreate: ({ editor }) => {
      const html = editor.isEmpty ? "" : editor.getHTML();
      saved.current.body = html;
      setBody(html);
    },
    onUpdate: ({ editor }) => setBody(editor.isEmpty ? "" : editor.getHTML()),
  });

  function submit(next: "draft" | "published") {
    start(async () => {
      const r = await save({ id, title, slug: slug || slugify(title), topic, body, status: next });
      if (!r.ok) return setMessage({ tone: "error", text: r.error });
      saved.current = { body, title };
      setId(r.id); setSlug(r.slug); setStatus(r.status);
      setMessage({ tone: "ok", text: r.status === "published" ? "Published." : "Draft saved." });
      // A new note gets its own address without reloading the editor (which would lose this message).
      if (!id) window.history.replaceState(null, "", `/write/${r.id}`);
      router.refresh();
    });
  }

  // Cmd/Ctrl+S keeps the current status: a draft stays a draft, a published note updates.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); submit(status); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function onFiles(files: FileList | null) {
    if (!uploads) return setMessage({ tone: "error", text: "Uploads switch on once the R2 bucket is set up" });
    for (const f of Array.from(files ?? [])) {
      if (!/^(image|video)\//.test(f.type)) { setMessage({ tone: "error", text: `${f.name} isn't a photo or video` }); continue; }
      const signed = await presign(f.name, f.type, f.size);
      if (!signed.ok) { setMessage({ tone: "error", text: signed.error }); continue; }
      setUpload({ name: f.name, percent: 0 });
      // XMLHttpRequest rather than fetch, for upload progress on long videos.
      const ok = await new Promise<boolean>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signed.uploadUrl);
        xhr.setRequestHeader("content-type", f.type);
        xhr.upload.onprogress = (e) => e.lengthComputable && setUpload({ name: f.name, percent: Math.round((e.loaded / e.total) * 100) });
        xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
        xhr.onerror = () => resolve(false);
        xhr.send(f);
      });
      setUpload(null);
      if (!ok) { setMessage({ tone: "error", text: `${f.name} didn't upload. Check the bucket's CORS settings allow this site.` }); continue; }
      editor?.chain().focus().command(afterSelectedBlock).insertContent({ type: "media", attrs: { src: signed.publicUrl, kind: f.type.startsWith("video/") ? "video" : "image", caption: "" } }).run();
    }
    if (file.current) file.current.value = "";
  }

  function openLink() {
    if (!editor) return;
    setPrompt({ kind: "link", value: editor.getAttributes("link").href ?? "" });
  }

  function submitPrompt(e: React.FormEvent) {
    e.preventDefault();
    if (!editor || !prompt) return;
    const value = prompt.value.trim();
    if (prompt.kind === "link") {
      const chain = editor.chain().focus().extendMarkRange("link");
      if (!value) chain.unsetLink().run();
      else chain.setLink({ href: /^(https?:|mailto:|\/|#)/i.test(value) ? value : `https://${value}` }).run();
      setPrompt(null);
    } else {
      if (!editor.chain().focus().command(afterSelectedBlock).setYoutubeVideo({ src: value }).run()) return setMessage({ tone: "error", text: "That doesn't look like a YouTube link" });
      setPrompt(null);
    }
  }

  return (
    <div className="editor">
      <div className="editor-bar">
        <span className={`status status-${status === "published" ? "go" : "work"}`}>{status === "published" ? "Published" : "Draft"}</span>
        {message && <span className={`editor-msg ${message.tone}`} role="status">{message.text}</span>}
        {upload && <span className="editor-msg">Uploading {upload.name}: {upload.percent}%</span>}
        <span className="editor-actions">
          {status === "published" && slug && <a href={`/notes/${slug}`} target="_blank" className="btn btn-ghost">View</a>}
          <button type="button" className="btn btn-ghost" disabled={pending} onClick={() => submit("draft")}>{status === "published" ? "Unpublish" : "Save draft"}</button>
          <button type="button" className="btn" disabled={pending} onClick={() => submit("published")}>{status === "published" ? "Update" : "Publish"}</button>
        </span>
        {editor && <Toolbar editor={editor} actions={actions.current} onLink={openLink} />}
        {prompt && (
          <form className="toolbar-prompt" onSubmit={submitPrompt}>
            <Icon name={prompt.kind === "link" ? "link" : "video"} />
            <input className="input" autoFocus value={prompt.value} onChange={(e) => setPrompt({ ...prompt, value: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Escape") { setPrompt(null); editor?.commands.focus(); } }}
              placeholder={prompt.kind === "link" ? "Paste a link, or leave empty to remove it" : "Paste a YouTube link"} />
            <button className="btn btn-sm">{prompt.kind === "link" ? "Apply" : "Embed"}</button>
            <button type="button" className="tool" aria-label="Cancel" onClick={() => { setPrompt(null); editor?.commands.focus(); }}><Icon name="close" /></button>
          </form>
        )}
      </div>

      <div className="editor-meta">
        <input className="editor-title" placeholder="Title" value={title}
          onChange={(e) => { setTitle(e.target.value); if (!slugEdited) setSlug(slugify(e.target.value)); }}
          onKeyDown={(e) => {
            // Focus moves now, not on the next frame, so the first letters typed land in the note.
            if (e.key === "Enter" && editor) { e.preventDefault(); editor.view.focus(); editor.commands.focus("start"); }
          }} />
        <div className="editor-fields">
          <div className="field">
            <span className="label">Topic</span>
            <Dropdown label="Topic" value={topic} onChange={setTopic} options={topics.map((t) => ({ value: t.key, label: t.title }))} />
          </div>
          <label className="field field-grow">
            <span className="label">Address</span>
            <span className="slug"><span>/notes/</span><input className="input" value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugEdited(true); }} placeholder="from-the-title" /></span>
          </label>
        </div>
      </div>

      <div className="editor-canvas" ref={area}>
        {editor && <BlockHandle editor={editor} area={area} actions={actions.current} />}
        <EditorContent editor={editor} />
        {editor && (
          <BubbleMenu editor={editor} className="bubble" options={{ placement: "top", offset: 8 }}
            shouldShow={({ editor, state }) => !state.selection.empty && !editor.isActive("codeBlock") && !editor.isActive("media") && !editor.isActive("youtube") && !editor.isActive("horizontalRule")}>
            <Marks editor={editor} onLink={openLink} />
          </BubbleMenu>
        )}
        <input ref={file} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      </div>

      {slash && (
        <div className="slash" role="listbox" aria-label="Blocks" style={{ left: slash.left, top: slash.top }}>
          {slash.items.length === 0 ? <p className="slash-empty">No block by that name</p> : slash.items.map((b, i) => (
            <button key={b.key} type="button" role="option" aria-selected={i === slash.index} className={`slash-item${i === slash.index ? " is-active" : ""}`}
              onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setSlash({ ...slash, index: i })} onClick={() => slash.pick(b)}>
              <span className="slash-icon"><Icon name={b.icon} /></span>
              <span className="slash-text"><span className={`look look-${b.key}`}>{b.label}</span><span className="slash-hint">{b.hint}</span></span>
            </button>
          ))}
        </div>
      )}

      {id && (
        <button type="button" className="btn-link danger" disabled={pending}
          onClick={() => { if (confirm("Delete this note for good?")) start(() => remove(id)); }}>Delete note</button>
      )}
    </div>
  );
}

// Bridges the "/" suggestion to React state: the plugin says where and what, the component draws it.
function slashMenu(set: (s: Slash | null) => void, current: { current: Slash | null }) {
  return () => {
    const show = (p: SuggestionProps<Block>, index = 0) => {
      const r = p.clientRect?.();
      if (!r) return set(null);
      // Open upwards when there isn't room below.
      const top = r.bottom + 340 > window.innerHeight ? Math.max(8, r.top - 346) : r.bottom + 6;
      set({ items: p.items, index, left: Math.min(r.left, window.innerWidth - 300), top, pick: (b) => p.command(b) });
    };
    return {
      onStart: (p: SuggestionProps<Block>) => show(p),
      onUpdate: (p: SuggestionProps<Block>) => show(p),
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        const s = current.current;
        if (!s) return false;
        const n = s.items.length;
        if (event.key === "Escape") { set(null); return true; }
        if (!n) return false;
        if (event.key === "ArrowDown") { set({ ...s, index: (s.index + 1) % n }); return true; }
        if (event.key === "ArrowUp") { set({ ...s, index: (s.index - 1 + n) % n }); return true; }
        if (event.key === "Enter" || event.key === "Tab") { s.pick(s.items[s.index]); return true; }
        return false;
      },
      onExit: () => set(null),
    };
  };
}

const marks: { key: string; label: string; icon: IconName; run: (e: Editor) => boolean; shortcut: string }[] = [
  { key: "bold", label: "Bold", icon: "bold", run: (e) => e.chain().focus().toggleBold().run(), shortcut: "⌘B" },
  { key: "italic", label: "Italic", icon: "italic", run: (e) => e.chain().focus().toggleItalic().run(), shortcut: "⌘I" },
  { key: "underline", label: "Underline", icon: "underline", run: (e) => e.chain().focus().toggleUnderline().run(), shortcut: "⌘U" },
  { key: "strike", label: "Strikethrough", icon: "strike", run: (e) => e.chain().focus().toggleStrike().run(), shortcut: "⌘⇧S" },
  { key: "code", label: "Inline code", icon: "inlineCode", run: (e) => e.chain().focus().toggleCode().run(), shortcut: "⌘E" },
  { key: "highlight", label: "Highlight", icon: "highlight", run: (e) => e.chain().focus().toggleHighlight().run(), shortcut: "⌘⇧H" },
];

// Bold, italic and the rest, plus link: shared by the toolbar and the menu over selected text.
function Marks({ editor, onLink }: { editor: Editor; onLink: () => void }) {
  const active = useEditorState({ editor, selector: ({ editor }) => Object.fromEntries([...marks.map((m) => [m.key, editor.isActive(m.key)]), ["link", editor.isActive("link")]]) as Record<string, boolean> });
  return (
    <>
      {marks.map((m) => (
        <button key={m.key} type="button" className={`tool${active[m.key] ? " is-on" : ""}`} aria-pressed={active[m.key]} aria-label={m.label}
          title={`${m.label} ${m.shortcut}`} onMouseDown={(e) => e.preventDefault()} onClick={() => m.run(editor)}>
          <Icon name={m.icon} />
        </button>
      ))}
      <button type="button" className={`tool${active.link ? " is-on" : ""}`} aria-pressed={active.link} aria-label="Link" title="Link"
        onMouseDown={(e) => e.preventDefault()} onClick={onLink}>
        <Icon name="link" />
      </button>
    </>
  );
}

function Toolbar({ editor, actions, onLink }: { editor: Editor; actions: EditorActions; onLink: () => void }) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      block: blocks.filter((b) => b.convert).find((b) => b.key !== "text" && b.active?.(editor))?.key ?? "text",
      undo: editor.can().undo(),
      redo: editor.can().redo(),
    }),
  });
  const insert = blocks.filter((b) => !b.convert);
  const tool = (key: string, label: string, icon: IconName, run: () => void, disabled = false) => (
    <button key={key} type="button" className="tool" aria-label={label} title={label} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={run}>
      <Icon name={icon} />
    </button>
  );
  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      <Dropdown compact keepFocus label="Block type" value={state.block}
        options={blocks.filter((b) => b.convert).map((b) => ({ value: b.key, label: b.label, icon: <Icon name={b.icon} />, className: `look look-${b.key}` }))}
        onChange={(key) => blocks.find((b) => b.key === key)!.run(editor, actions)} />
      <span className="toolbar-sep" />
      <Marks editor={editor} onLink={onLink} />
      <span className="toolbar-sep" />
      {insert.map((b) => tool(b.key, b.label, b.icon, () => b.run(editor, actions)))}
      <span className="toolbar-sep toolbar-push" />
      {tool("undo", "Undo ⌘Z", "undo", () => editor.chain().focus().undo().run(), !state.undo)}
      {tool("redo", "Redo ⌘⇧Z", "redo", () => editor.chain().focus().redo().run(), !state.redo)}
    </div>
  );
}
