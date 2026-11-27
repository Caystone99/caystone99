"use client";

import { InputRule, Node, type Editor } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { closeHistory } from "@tiptap/pm/history";
import { TextSelection } from "@tiptap/pm/state";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { languageLabel, languages, lowlight } from "@/lib/code";
import { at, emptyGraph, graphSvg, H, layout, marksText, parseMarks, parsePoints, pointsText, readGraph, W, type End, type Graph, type Mark } from "@/lib/graph";
import Dropdown from "../Dropdown";
import { Icon, type IconName } from "./icons";
import MathInput, { renderMath } from "./MathInput";

// The cells that hold more than text: equations, graphs and code. Each shows what will be published and opens
// its own editor when clicked, or when it's just been added.

// Where each editor's open cell is. An undo can redraw a cell from scratch, and this is how the new one knows it
// was open.
const openCell = new WeakMap<Editor, number>();

// Open while being edited; closes on Done, Escape or a click anywhere else. Opens by itself when the cell is
// new (empty, added while writing) or reached with the arrow keys. A cell closed with nothing in it is removed,
// so an equation or graph added by mistake doesn't linger as a blank.
export function useEditing({ editor, selected, empty, getPos, size }: { editor: Editor; selected: boolean; empty: boolean; getPos: () => number | undefined; size: number }) {
  const [editing, setEditing] = useState(() => (empty && editor.isFocused) || (openCell.has(editor) && openCell.get(editor) === getPos()));
  const root = useRef<HTMLElement>(null);
  const emptyRef = useRef(empty);
  emptyRef.current = empty;
  useEffect(() => { if (selected) setEditing(true); }, [selected]);
  useEffect(() => {
    const pos = getPos();
    if (editing && typeof pos === "number") openCell.set(editor, pos);
    else if (!editing && openCell.get(editor) === pos) openCell.delete(editor);
  }, [editing, editor, getPos]);
  useEffect(() => {
    if (!editing) return;
    const away = (e: PointerEvent) => {
      if (root.current?.contains(e.target as globalThis.Node)) return;
      if (emptyRef.current) remove(editor, getPos, size, false);
      else setEditing(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [editing]);
  // Done, Escape: back to writing after the cell, or where it was if it's removed for being empty.
  const close = () => {
    if (emptyRef.current) return remove(editor, getPos, size);
    setEditing(false);
    after(editor, getPos, size);
  };
  return { editing, setEditing, root, close, remove: () => remove(editor, getPos, size) };
}

// Takes the cell out of the note. With `focus`, the cursor goes where it was; without, it stays wherever the
// writer just clicked.
const remove = (editor: Editor, getPos: () => number | undefined, size: number, focus = true) => {
  const pos = getPos();
  if (typeof pos !== "number") return;
  openCell.delete(editor);
  // Its own undo step, so Cmd/Ctrl+Z brings back just the cell, however quickly it followed the last edit.
  const tr = closeHistory(editor.state.tr.delete(pos, pos + size));
  if (focus) tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(pos, tr.doc.content.size)), -1));
  editor.view.dispatch(tr);
  if (focus) editor.view.focus();
};

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
  const { editing, setEditing, root, close, remove } = useEditing({ editor, selected, empty: !latex.trim(), getPos, size: node.nodeSize });
  const shown = latex.trim() ? renderMath(latex, true) : null;
  return (
    <NodeViewWrapper ref={root} className={`math-cell${editing ? " is-editing" : ""}`} data-drag-handle="">
      <div className="math-show" onClick={() => setEditing(true)} title="Click to edit">
        {!shown ? <span className="cell-empty">Empty equation. Click to write it.</span>
          : shown.error ? <span className="math-bad">{latex}</span>
          : <span dangerouslySetInnerHTML={{ __html: shown.html }} />}
      </div>
      {editing && <MathInput latex={latex} display onChange={(v) => updateAttributes({ latex: v })} onDone={close} onRemove={remove} />}
    </NodeViewWrapper>
  );
}

function MathInlineView({ node, updateAttributes, selected, editor, getPos }: ReactNodeViewProps) {
  const latex = node.attrs.latex as string;
  const { editing, setEditing, root, close, remove } = useEditing({ editor, selected, empty: !latex.trim(), getPos, size: node.nodeSize });
  const shown = latex.trim() ? renderMath(latex, false) : null;
  return (
    <NodeViewWrapper as="span" ref={root} className={`math-inline${editing ? " is-editing" : ""}`}>
      <span className="math-show" onClick={() => setEditing(true)} title="Click to edit">
        {!shown ? <span className="cell-empty">equation</span>
          : shown.error ? <span className="math-bad">{latex}</span>
          : <span dangerouslySetInnerHTML={{ __html: shown.html }} />}
      </span>
      {editing && <span className="math-pop" contentEditable={false}><MathInput latex={latex} display={false} onChange={(v) => updateAttributes({ latex: v })} onDone={close} onRemove={remove} /></span>}
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
  // Empty means nothing at all set: no points, names, bounds or caption.
  const empty = !graph.points.length && !graph.marks.length && !graph.xLabel && !graph.yLabel && !caption && [graph.xMin, graph.xMax, graph.yMin, graph.yMax].every((b) => b === null);
  const { editing, setEditing, root, close, remove } = useEditing({ editor, selected, empty, getPos, size: node.nodeSize });
  // The points as typed, kept apart from the stored ones so a half-written line isn't thrown away. When the stored
  // points change some other way (an undo, say), the text follows.
  const stored = pointsText(graph.points);
  const [text, setText] = useState(stored);
  useEffect(() => { if (pointsText(parsePoints(text)) !== stored) setText(stored); }, [stored]);
  // The lines and arrows as typed, kept the same way.
  const storedMarks = marksText(graph.marks);
  const [markText, setMarkText] = useState(storedMarks);
  useEffect(() => { if (marksText(parseMarks(markText, graph.points)) !== storedMarks) setMarkText(storedMarks); }, [storedMarks]);
  const set = (next: Partial<Graph>) => updateAttributes({ graph: { ...graph, ...next } });
  // What a click on the graph does: add a point, or draw a line, arrow or vector from one click to the next.
  const [tool, setTool] = useState<"point" | Mark["kind"]>("point");
  const [pending, setPending] = useState<End | null>(null);
  useEffect(() => { if (!editing) setPending(null); }, [editing]);

  function click(e: React.MouseEvent<HTMLDivElement>) {
    if (!editing) return setEditing(true);
    const svg = (e.currentTarget as HTMLElement).querySelector("svg");
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W, py = ((e.clientY - r.top) / r.height) * H;
    const { invert, sx, sy } = layout(graph);
    if (tool === "point") {
      const points = [...graph.points, invert(px, py)];
      setText(pointsText(points));
      return set({ points });
    }
    // An end lands on a point when the click is near one, and then follows it; anywhere else it stays put.
    let near = -1, best = 14;
    graph.points.forEach((p, i) => { const d = Math.hypot(sx(p.x) - px, sy(p.y) - py); if (d < best) { best = d; near = i; } });
    const end: End = near >= 0 ? { point: near } : invert(px, py);
    if (!pending) return setPending(end);
    const marks = [...graph.marks, { kind: tool, from: pending, to: end }];
    setPending(null);
    setMarkText(marksText(marks));
    set({ marks });
  }

  const tools: { key: typeof tool; label: string; icon: IconName }[] = [
    { key: "point", label: "Point", icon: "point" },
    { key: "line", label: "Line", icon: "lineTool" },
    { key: "arrow", label: "Arrow", icon: "arrowTool" },
    { key: "vector", label: "Vector", icon: "vectorTool" },
  ];
  const hint = tool === "point" ? "Click the graph to add a point."
    : pending ? `Now click where it ends. Esc to cancel.` : `Click where the ${tool} starts: on a point to join it, or anywhere.`;

  return (
    <NodeViewWrapper as="figure" ref={root} className={`note-graph${editing ? " is-editing" : ""}`} data-drag-handle="">
      {editing && (
        <div className="graph-tools" onMouseDown={(e) => e.stopPropagation()}>
          <span className="graph-tool-set" role="radiogroup" aria-label="Clicking the graph adds">
            {tools.map((t) => (
              <button key={t.key} type="button" role="radio" aria-checked={tool === t.key} className={`graph-tool${tool === t.key ? " is-on" : ""}`}
                onClick={() => { setTool(t.key); setPending(null); }}>
                <Icon name={t.icon} />{t.label}
              </button>
            ))}
          </span>
          <span className="graph-hint">{hint}</span>
        </div>
      )}
      <div className={`graph-show${editing ? " is-adding" : ""}`} onClick={click} title={editing ? undefined : "Click to edit"}
        tabIndex={editing ? -1 : undefined} onKeyDown={(e) => { if (e.key === "Escape" && pending) { e.stopPropagation(); setPending(null); } }}
        dangerouslySetInnerHTML={{ __html: graphSvg(graph, editing ? { numbers: true, pending: pending ? at(graph, pending) : undefined } : {}) }} />
      {editing ? (
        <div className="graph-edit" onMouseDown={(e) => e.stopPropagation()}>
          <div className="graph-texts">
            <label className="graph-points">
              <span className="label">Points: x, y and an optional label, one per line</span>
              <textarea className="input" rows={5} value={text} spellCheck={false} autoFocus placeholder={"0, 0, start\n1, 2\n2, 3.5"}
                onChange={(e) => { setText(e.target.value); set({ points: parsePoints(e.target.value) }); }}
                onKeyDown={(e) => { if (e.key === "Escape") close(); }} />
            </label>
            <label className="graph-points">
              <span className="label">Lines, arrows and vectors: P1 is the first point; or give x, y</span>
              <textarea className="input" rows={3} value={markText} spellCheck={false} placeholder={"arrow P1 -> P3 force\nline 0, 0 -> 2, 4\nvector 0, 0 -> 3, 4 v"}
                onChange={(e) => { setMarkText(e.target.value); set({ marks: parseMarks(e.target.value, graph.points) }); }}
                onKeyDown={(e) => { if (e.key === "Escape") close(); }} />
            </label>
          </div>
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
            <span className="cell-actions">
              <button type="button" className="btn btn-sm" onClick={close}>Done</button>
              <button type="button" className="tool" aria-label="Delete graph" title="Delete graph" onClick={remove}><Icon name="trash" /></button>
            </span>
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
