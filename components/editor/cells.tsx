"use client";

import { InputRule, Node, type Editor } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { TextSelection } from "@tiptap/pm/state";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { languageLabel, languages, lowlight } from "@/lib/code";
import { emptyGraph, graphSvg, H, layout, parsePoints, pointsText, readGraph, W, type Graph } from "@/lib/graph";
import Dropdown from "../Dropdown";
import { Icon } from "./icons";
import MathInput, { renderMath } from "./MathInput";

// The cells that hold more than text: equations, graphs and code. Each shows what will be published and opens
// its own editor when clicked, or when it's just been added.

// Where each editor's open cell is. An undo can redraw a cell from scratch, and this is how the new one knows it
// was open.
const openCell = new WeakMap<Editor, number>();

// Open while being edited; closes on Done, Escape or a click anywhere else. Opens by itself when the cell is
// new (empty, added while writing) or reached with the arrow keys.
function useEditing({ editor, selected, empty, getPos }: { editor: Editor; selected: boolean; empty: boolean; getPos: () => number | undefined }) {
  const [editing, setEditing] = useState(() => (empty && editor.isFocused) || (openCell.has(editor) && openCell.get(editor) === getPos()));
  const root = useRef<HTMLElement>(null);
  useEffect(() => { if (selected) setEditing(true); }, [selected]);
  useEffect(() => {
    const pos = getPos();
    if (editing && typeof pos === "number") openCell.set(editor, pos);
    else if (!editing && openCell.get(editor) === pos) openCell.delete(editor);
  }, [editing, editor, getPos]);
  useEffect(() => {
    if (!editing) return;
    const away = (e: PointerEvent) => { if (!root.current?.contains(e.target as globalThis.Node)) setEditing(false); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [editing]);
  return { editing, setEditing, root };
}

// Back to writing, just after the cell: on the next line, which is added if there isn't one to write on. Waits
// for the cell's editor to close first, so its field doesn't take the focus with it.
const after = (editor: Editor, getPos: () => number | undefined, size: number) => {
  const pos = getPos();
  if (typeof pos !== "number") return;
  const end = pos + size;
  setTimeout(() => {
    const { tr, schema } = editor.state;
    const $end = tr.doc.resolve(end);
    if (!$end.parent.inlineContent && (!$end.nodeAfter || $end.nodeAfter.isAtom)) tr.insert(end, schema.nodes.paragraph.create());
    tr.setSelection(TextSelection.near(tr.doc.resolve($end.parent.inlineContent ? end : end + 1)));
    editor.view.dispatch(tr.scrollIntoView());
    editor.view.focus();
  });
};

function MathBlockView({ node, updateAttributes, selected, editor, getPos }: ReactNodeViewProps) {
  const latex = node.attrs.latex as string;
  const { editing, setEditing, root } = useEditing({ editor, selected, empty: !latex, getPos });
  const shown = latex.trim() ? renderMath(latex, true) : null;
  const done = () => { setEditing(false); after(editor, getPos, node.nodeSize); };
  return (
    <NodeViewWrapper ref={root} className={`math-cell${editing ? " is-editing" : ""}`} data-drag-handle="">
      <div className="math-show" onClick={() => setEditing(true)} title="Click to edit">
        {!shown ? <span className="cell-empty">Empty equation. Click to write it.</span>
          : shown.error ? <span className="math-bad">{latex}</span>
          : <span dangerouslySetInnerHTML={{ __html: shown.html }} />}
      </div>
      {editing && <MathInput latex={latex} display onChange={(v) => updateAttributes({ latex: v })} onDone={done} />}
    </NodeViewWrapper>
  );
}

function MathInlineView({ node, updateAttributes, selected, editor, getPos }: ReactNodeViewProps) {
  const latex = node.attrs.latex as string;
  const { editing, setEditing, root } = useEditing({ editor, selected, empty: !latex, getPos });
  const shown = latex.trim() ? renderMath(latex, false) : null;
  const done = () => { setEditing(false); after(editor, getPos, node.nodeSize); };
  return (
    <NodeViewWrapper as="span" ref={root} className={`math-inline${editing ? " is-editing" : ""}`}>
      <span className="math-show" onClick={() => setEditing(true)} title="Click to edit">
        {!shown ? <span className="cell-empty">equation</span>
          : shown.error ? <span className="math-bad">{latex}</span>
          : <span dangerouslySetInnerHTML={{ __html: shown.html }} />}
      </span>
      {editing && <span className="math-pop" contentEditable={false}><MathInput latex={latex} display={false} onChange={(v) => updateAttributes({ latex: v })} onDone={done} /></span>}
    </NodeViewWrapper>
  );
}

const latexAttr = { latex: { default: "", parseHTML: (el: HTMLElement) => el.textContent ?? "", renderHTML: () => ({}) } };

// An equation on its own line. Stored as its LaTeX; the site turns it into typeset maths.
export const MathBlock = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes: () => latexAttr,
  parseHTML: () => [{ tag: 'div[data-math="block"]' }],
  renderHTML: ({ node }) => ["div", { "data-math": "block" }, node.attrs.latex],
  addNodeView() {
    return ReactNodeViewRenderer(MathBlockView);
  },
  // "$$" and a space on an empty line starts one.
  addInputRules() {
    return [new InputRule({
      find: /^\$\$\s$/,
      handler: ({ state, range }) => {
        const $from = state.doc.resolve(range.from);
        if ($from.parent.textContent.trim() !== "$$") return null;
        state.tr.replaceWith($from.before(), $from.after(), this.type.create());
      },
    })];
  },
});

// An equation in a line of text. Typing $x^2$ makes one.
export const MathInline = Node.create({
  name: "mathInline",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes: () => latexAttr,
  parseHTML: () => [{ tag: 'span[data-math="inline"]' }],
  renderHTML: ({ node }) => ["span", { "data-math": "inline" }, node.attrs.latex],
  addNodeView() {
    return ReactNodeViewRenderer(MathInlineView);
  },
  addInputRules() {
    return [new InputRule({
      // Not after a letter or digit, so prices like $5 and $10 stay as they are.
      find: /(?:^|[^\w$\\])\$([^$\s](?:[^$]*[^$\s])?)\$$/,
      handler: ({ state, range, match }) => {
        const start = range.from + match[0].indexOf("$");
        state.tr.replaceWith(start, range.to, this.type.create({ latex: match[1] }));
      },
    })];
  },
});

function GraphView({ node, updateAttributes, selected, editor, getPos }: ReactNodeViewProps) {
  const graph = readGraph(node.attrs.graph);
  const caption = node.attrs.caption as string;
  const { editing, setEditing, root } = useEditing({ editor, selected, empty: !graph.points.length, getPos });
  // The points as typed, kept apart from the stored ones so a half-written line isn't thrown away. When the stored
  // points change some other way (an undo, say), the text follows.
  const stored = pointsText(graph.points);
  const [text, setText] = useState(stored);
  useEffect(() => { if (pointsText(parsePoints(text)) !== stored) setText(stored); }, [stored]);
  const set = (next: Partial<Graph>) => updateAttributes({ graph: { ...graph, ...next } });
  const done = () => { setEditing(false); after(editor, getPos, node.nodeSize); };

  // Clicking the graph while editing adds a point there.
  function add(e: React.MouseEvent<HTMLDivElement>) {
    if (!editing) return setEditing(true);
    const svg = (e.currentTarget as HTMLElement).querySelector("svg");
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const p = layout(graph).invert(((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H);
    const points = [...graph.points, p];
    setText(pointsText(points));
    set({ points });
  }

  return (
    <NodeViewWrapper as="figure" ref={root} className={`note-graph${editing ? " is-editing" : ""}`} data-drag-handle="">
      <div className={`graph-show${editing ? " is-adding" : ""}`} onClick={add} title={editing ? "Click to add a point" : "Click to edit"}
        dangerouslySetInnerHTML={{ __html: graphSvg(graph) }} />
      {editing ? (
        <div className="graph-edit" onMouseDown={(e) => e.stopPropagation()}>
          <label className="graph-points">
            <span className="label">Points: x, y and an optional label, one per line. Or click the graph.</span>
            <textarea className="input" rows={5} value={text} spellCheck={false} autoFocus placeholder={"0, 0, start\n1, 2\n2, 3.5"}
              onChange={(e) => { setText(e.target.value); set({ points: parsePoints(e.target.value) }); }}
              onKeyDown={(e) => { if (e.key === "Escape") done(); }} />
          </label>
          <div className="graph-fields">
            {(["x", "y"] as const).map((a) => (
              <div key={a} className="field">
                <span className="label">{a === "x" ? "Across (x)" : "Up (y)"}</span>
                <input className="input" value={graph[`${a}Label`]} placeholder={a === "x" ? "Time (s)" : "Distance (m)"} aria-label={`${a} axis name`}
                  onChange={(e) => set({ [`${a}Label`]: e.target.value })} />
                <span className="graph-bounds">
                  from <BoundInput label={`${a} from`} value={graph[`${a}Min`]} onChange={(v) => set({ [`${a}Min`]: v })} />
                  to <BoundInput label={`${a} to`} value={graph[`${a}Max`]} onChange={(v) => set({ [`${a}Max`]: v })} />
                </span>
              </div>
            ))}
            <label className="graph-check"><input type="checkbox" checked={graph.line} onChange={(e) => set({ line: e.target.checked })} />Join the points</label>
            <button type="button" className="btn btn-sm" onClick={done}>Done</button>
          </div>
        </div>
      ) : !graph.points.length && <p className="cell-empty graph-empty">No points yet. Click to add some.</p>}
      <input className="media-caption" value={caption} placeholder="Add a caption" aria-label="Caption" onChange={(e) => updateAttributes({ caption: e.target.value })} />
    </NodeViewWrapper>
  );
}

const bound = (text: string) => (text.trim() === "" || !Number.isFinite(Number(text)) ? null : Number(text));

// One end of an axis. Kept as typed, so "-" or "2." can be on their way to a number; empty means it follows the
// points.
function BoundInput({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  const [text, setText] = useState(value === null ? "" : String(value));
  useEffect(() => { if (bound(text) !== value) setText(value === null ? "" : String(value)); }, [value]);
  return (
    <input className="input graph-bound" inputMode="decimal" placeholder="auto" aria-label={label} value={text}
      onChange={(e) => { setText(e.target.value); onChange(bound(e.target.value)); }} />
  );
}

// Points on a graph, with axis labels, optional bounds and a caption. Stored as data; drawn the same way here and on the site.
export const GraphBlock = Node.create({
  name: "graph",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return { graph: { default: emptyGraph }, caption: { default: "" } };
  },
  parseHTML: () => [{
    tag: "figure.note-graph",
    getAttrs: (el) => {
      try { return { graph: readGraph(JSON.parse(el.getAttribute("data-graph") ?? "{}")), caption: el.querySelector("figcaption")?.textContent ?? "" }; }
      catch { return { graph: emptyGraph, caption: "" }; }
    },
  }],
  renderHTML({ node }) {
    const attrs = { class: "note-graph", "data-graph": JSON.stringify(readGraph(node.attrs.graph)) };
    return node.attrs.caption ? ["figure", attrs, ["figcaption", {}, node.attrs.caption]] : ["figure", attrs];
  },
  addNodeView() {
    return ReactNodeViewRenderer(GraphView);
  },
});

function CodeCellView({ node, updateAttributes }: ReactNodeViewProps) {
  const [copied, setCopied] = useState(false);
  const language = (node.attrs.language as string | null) ?? "";
  return (
    <NodeViewWrapper className="code-cell">
      <div className="code-cell-head" contentEditable={false}>
        <Dropdown compact label="Language" value={language} onChange={(v) => updateAttributes({ language: v || null })}
          options={[...languages, ...(languages.some((l) => l.value === language) ? [] : [{ value: language, label: languageLabel(language) }])]} />
        <input className="code-cell-title" value={node.attrs.title as string} placeholder="File name or title (optional)" aria-label="Code title"
          onChange={(e) => updateAttributes({ title: e.target.value })} />
        <button type="button" className="tool" aria-label="Copy code" title={copied ? "Copied" : "Copy code"}
          onClick={() => { void navigator.clipboard.writeText(node.textContent); setCopied(true); setTimeout(() => setCopied(false), 1400); }}>
          <Icon name={copied ? "check" : "copy"} />
        </button>
      </div>
      <pre><NodeViewContent<"code"> as="code" className={language ? `language-${language}` : undefined} /></pre>
    </NodeViewWrapper>
  );
}

// A code cell: a language (highlighted as you type), an optional title such as a file name, and a copy button.
// Tab indents inside it.
export const CodeCell = CodeBlockLowlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      title: { default: "", parseHTML: (el) => el.getAttribute("data-title") ?? "", renderHTML: (a) => (a.title ? { "data-title": a.title } : {}) },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(CodeCellView);
  },
}).configure({ lowlight, defaultLanguage: null, enableTabIndentation: true, tabSize: 4 });
