"use client";

import { InputRule, Node, type Editor } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { closeHistory } from "@tiptap/pm/history";
import { TextSelection } from "@tiptap/pm/state";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { languageLabel, languages, lowlight } from "@/lib/code";
import { at, emptyGraph, endText, graphSvg, H, layout, markKinds, parseEnd, parsePoints, pointsText, readGraph, W, type End, type Graph, type Mark } from "@/lib/graph";
import { colours, type Colour } from "@/lib/svg";
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
    // Judged by the click's path, taken before anything handles it: a cell that redraws itself on the click (a graph
    // marking where a line starts) would otherwise look clicked from outside.
    const away = (e: PointerEvent) => {
      if (root.current && e.composedPath().includes(root.current)) return;
      if (emptyRef.current) remove(editor, getPos, size, false);
      else setEditing(false);
    };
    document.addEventListener("pointerdown", away, true);
    return () => document.removeEventListener("pointerdown", away, true);
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

type GraphTool = "select" | "point" | Mark["kind"];
// What the pointer is doing on the graph between pressing and letting go.
type GraphDrag =
  | { type: "end"; mark: number; which: "from" | "to" }
  | { type: "mark"; mark: number; px: number; py: number; start: Mark }
  | { type: "point"; index: number }
  | { type: "draw"; px: number; py: number; moved: boolean };

const graphTools: { key: GraphTool; label: string; icon: IconName; hint: string }[] = [
  { key: "select", label: "Select", icon: "select", hint: "Click a line to select it, then drag it or its ends, or press Backspace to delete it. Drag points to move them." },
  { key: "point", label: "Point", icon: "point", hint: "Click the graph to add a point." },
  { key: "line", label: "Line", icon: "lineTool", hint: "" },
  { key: "arrow", label: "Arrow", icon: "arrowTool", hint: "" },
  { key: "vector", label: "Vector", icon: "vectorTool", hint: "" },
];

// How far a point (px, py) is from the segment between a and b, in drawing units.
function toSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const l = (bx - ax) ** 2 + (by - ay) ** 2;
  const t = l ? Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / l)) : 0;
  return Math.hypot(px - (ax + t * (bx - ax)), py - (ay + t * (by - ay)));
}

function GraphView({ node, updateAttributes, selected, editor, getPos }: ReactNodeViewProps) {
  const stored = readGraph(node.attrs.graph);
  // While dragging, changes are kept here and saved when the pointer is let go: one undo step per drag.
  const [draft, setDraft] = useState<Graph | null>(null);
  const graph = draft ?? stored;
  const caption = node.attrs.caption as string;
  // Empty means nothing at all set: no points, lines, names, bounds or caption.
  const empty = !stored.points.length && !stored.marks.length && !stored.xLabel && !stored.yLabel && !caption && [stored.xMin, stored.xMax, stored.yMin, stored.yMax].every((b) => b === null);
  const { editing, setEditing, root, close, remove } = useEditing({ editor, selected, empty, getPos, size: node.nodeSize });
  // The points as typed, kept apart from the stored ones so a half-written line isn't thrown away. When the points
  // change some other way (a drag, an undo), the text follows.
  const shown = pointsText(graph.points);
  const [text, setText] = useState(shown);
  useEffect(() => { if (pointsText(parsePoints(text)) !== shown) setText(shown); }, [shown]);
  // Clicks, drags and deletions (`step`) are each their own undo step; typing undoes in runs, as writing does.
  const set = (next: Partial<Graph>, step = false) => {
    const pos = getPos();
    if (!step || typeof pos !== "number") return updateAttributes({ graph: { ...stored, ...next } });
    editor.view.dispatch(closeHistory(editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, graph: { ...stored, ...next } })));
  };

  const [tool, setTool] = useState<GraphTool>(() => (stored.points.length || stored.marks.length ? "select" : "point"));
  const [pending, setPending] = useState<End | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  // How the next line drawn looks.
  const [look, setLook] = useState<{ colour?: Colour; shadow: boolean }>({ shadow: false });
  const drag = useRef<GraphDrag | null>(null);
  const area = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!editing) { setPending(null); setPicked(null); } }, [editing]);
  if (picked !== null && picked >= graph.marks.length) setPicked(null);

  // The pointer in the graph's drawing units, and the layout at the moment it was pressed (so the axes don't move
  // under a drag that stretches them).
  const frame = useRef(layout(graph));
  function where(e: React.PointerEvent) {
    const r = area.current!.querySelector("svg")!.getBoundingClientRect();
    return { px: ((e.clientX - r.left) / r.width) * W, py: ((e.clientY - r.top) / r.height) * H };
  }

  // Where an end goes: onto a point when it's close to one (and then it follows the point), otherwise onto the
  // grid. Alt turns snapping off.
  function snapEnd(px: number, py: number, free: boolean, skip = -1): End {
    const { sx, sy, invert } = frame.current;
    if (!free) {
      let near = -1, best = 14;
      graph.points.forEach((p, i) => { const d = Math.hypot(sx(p.x) - px, sy(p.y) - py); if (i !== skip && d < best) { best = d; near = i; } });
      if (near >= 0) return { point: near };
    }
    return invert(px, py, free ? 10 : 2);
  }

  const changeMark = (i: number, patch: Partial<Mark>, base = graph) => ({ ...base, marks: base.marks.map((m, j) => (j === i ? { ...m, ...patch } : m)) });

  function down(e: React.PointerEvent<HTMLDivElement>) {
    if (!editing) return;
    e.preventDefault();
    area.current!.focus({ preventScroll: true });
    area.current!.setPointerCapture(e.pointerId);
    frame.current = layout(graph);
    const { px, py } = where(e);
    const { sx, sy, invert } = frame.current;
    const ends = (m: Mark) => [at(graph, m.from), at(graph, m.to)].map((p) => p && { x: sx(p.x), y: sy(p.y) });

    if (tool === "point") {
      const points = [...graph.points, invert(px, py)];
      setText(pointsText(points));
      return set({ points }, true);
    }
    if (tool !== "select") {
      const end = snapEnd(px, py, e.altKey);
      // A second click finishes a line started with a click; otherwise this starts one, which a drag can finish.
      if (pending) return finish(end);
      setPending(end);
      drag.current = { type: "draw", px, py, moved: false };
      return;
    }
    // The selected line's ends come first, then points, then any line under the pointer.
    if (picked !== null) {
      const [a, b] = ends(graph.marks[picked]);
      const which = a && Math.hypot(a.x - px, a.y - py) < 10 ? "from" : b && Math.hypot(b.x - px, b.y - py) < 10 ? "to" : null;
      if (which) { drag.current = { type: "end", mark: picked, which }; return setDraft(graph); }
    }
    const point = graph.points.findIndex((p) => Math.hypot(sx(p.x) - px, sy(p.y) - py) < 9);
    if (point >= 0) { drag.current = { type: "point", index: point }; setPicked(null); return setDraft(graph); }
    let found = -1, best = 8;
    graph.marks.forEach((m, i) => {
      const [a, b] = ends(m);
      if (!a || !b) return;
      const d = toSegment(px, py, a.x, a.y, b.x, b.y);
      if (d <= best) { best = d; found = i; }
    });
    // Ties go to the line on top (drawn last).
    if (found < 0) return setPicked(null);
    setPicked(found);
    drag.current = { type: "mark", mark: found, px, py, start: graph.marks[found] };
    setDraft(graph);
  }

  function move(e: React.PointerEvent<HTMLDivElement>) {
    if (!editing) return;
    const { px, py } = where(e);
    const g = drag.current;
    if (!g) {
      if (pending) setHover(at(graph, snapEnd(px, py, e.altKey)) ?? null);
      return;
    }
    const { invert, sx, sy } = frame.current;
    if (g.type === "draw") {
      if (Math.hypot(px - g.px, py - g.py) > 6) g.moved = true;
      setHover(at(graph, snapEnd(px, py, e.altKey)) ?? null);
    } else if (g.type === "end" && draft) {
      const end = snapEnd(px, py, e.altKey);
      setHover(at(draft, end) ?? null);
      setDraft(changeMark(g.mark, { [g.which]: end }, draft));
    } else if (g.type === "point" && draft) {
      const p = invert(px, py, e.altKey ? 10 : 2);
      setDraft({ ...draft, points: draft.points.map((q, i) => (i === g.index ? { ...q, ...p } : q)) });
    } else if (g.type === "mark" && draft) {
      // The whole line moves, and comes loose from any points it was joined to. Its start snaps (to a point or the
      // grid) and the rest of the line keeps its shape.
      const a = at(graph, g.start.from), b = at(graph, g.start.to);
      if (!a || !b) return;
      const from = snapEnd(sx(a.x) + px - g.px, sy(a.y) + py - g.py, e.altKey);
      const f = at(draft, from)!;
      setHover(f);
      setDraft(changeMark(g.mark, { from, to: { x: Number((b.x + f.x - a.x).toPrecision(10)), y: Number((b.y + f.y - a.y).toPrecision(10)) } }, draft));
    }
  }

  function up(e: React.PointerEvent<HTMLDivElement>) {
    const g = drag.current;
    drag.current = null;
    setHover(null);
    if (g?.type === "draw") {
      // Pressed, dragged and let go: the line ends where the pointer did. A plain click waits for a second one.
      if (g.moved) { const { px, py } = where(e); finish(snapEnd(px, py, e.altKey)); }
      return;
    }
    if (draft) {
      if (JSON.stringify(draft) !== JSON.stringify(stored)) set(draft, true);
      setDraft(null);
    }
  }

  function finish(to: End) {
    if (!pending || tool === "select" || tool === "point") return;
    setPending(null);
    setHover(null);
    // A click on the same spot doesn't leave a line of no length.
    if (JSON.stringify(pending) === JSON.stringify(to)) return;
    set({ marks: [...graph.marks, { kind: tool, from: pending, to, ...(look.colour ? { colour: look.colour } : {}), ...(look.shadow ? { shadow: true } : {}) }] }, true);
    setPicked(graph.marks.length);
  }

  function deleteMark(i: number) {
    set({ marks: graph.marks.filter((_, j) => j !== i) }, true);
    setPicked(null);
  }

  function keys(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      if (pending) { setPending(null); setHover(null); } else if (picked !== null) setPicked(null); else close();
    } else if ((e.key === "Backspace" || e.key === "Delete") && picked !== null) {
      e.preventDefault();
      deleteMark(picked);
    }
  }

  const lineTool = tool === "line" || tool === "arrow" || tool === "vector";
  const hint = lineTool
    ? pending ? "Now click (or drag to) where it ends. Esc to cancel." : `Click where the ${tool} starts, or drag it out. Near a point, an end joins it. Alt: no snapping.`
    : graphTools.find((t) => t.key === tool)!.hint;
  const preview = lineTool && pending && hover ? { kind: tool, from: at(graph, pending) ?? hover, to: hover, ...look } : undefined;

  return (
    <NodeViewWrapper as="figure" ref={root} className={`note-graph${editing ? " is-editing" : ""}`} {...(editing ? {} : { "data-drag-handle": "" })}>
      {editing && (
        <div className="graph-tools">
          <span className="graph-tool-set" role="radiogroup" aria-label="Graph tool">
            {graphTools.map((t) => (
              <button key={t.key} type="button" role="radio" aria-checked={tool === t.key} className={`graph-tool${tool === t.key ? " is-on" : ""}`}
                onClick={() => { setTool(t.key); setPending(null); setHover(null); }}>
                <Icon name={t.icon} />{t.label}
              </button>
            ))}
          </span>
          {lineTool && (
            <span className="graph-look" aria-label="How new lines look">
              <Swatches value={look.colour} onChange={(colour) => setLook({ ...look, colour })} />
              <button type="button" className={`tool${look.shadow ? " is-on" : ""}`} aria-pressed={look.shadow} aria-label="Shadow" title="Shadow: an outline that keeps it clear of lines it crosses"
                onClick={() => setLook({ ...look, shadow: !look.shadow })}><Icon name="shadow" /></button>
            </span>
          )}
          <span className="graph-hint">{hint}</span>
        </div>
      )}
      <div ref={area} className={`graph-show${editing ? ` is-editing tool-${tool}` : ""}`} tabIndex={editing ? 0 : undefined} title={editing ? undefined : "Click to edit"}
        onClick={() => !editing && setEditing(true)} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onPointerLeave={() => !drag.current && setHover(null)} onKeyDown={keys} onDragStart={(e) => e.preventDefault()}
        dangerouslySetInnerHTML={{ __html: graphSvg(graph, editing ? { numbers: true, pending: hover ?? (pending ? at(graph, pending) : undefined), preview, selected: picked } : {}) }} />
      {editing ? (
        <div className="graph-edit">
          <section className="graph-sec">
            <h4 className="graph-sec-title">Points <span>x, y and a label if you like, one per line</span></h4>
            <textarea className="input" rows={4} value={text} spellCheck={false} autoFocus={!stored.points.length} placeholder={"0, 0, start\n1, 2\n2, 3.5"} aria-label="Points"
              onChange={(e) => { setText(e.target.value); set({ points: parsePoints(e.target.value) }); }}
              onKeyDown={(e) => { if (e.key === "Escape") close(); }} />
          </section>
          <section className="graph-sec">
            <h4 className="graph-sec-title">Axes <span>leave from and to empty to fit the points</span></h4>
            {(["x", "y"] as const).map((a) => (
              <div key={a} className="graph-axis">
                <span className="graph-axis-name">{a}</span>
                <input className="input" value={graph[`${a}Label`]} placeholder={a === "x" ? "Name, e.g. Time (s)" : "Name, e.g. Distance (m)"} aria-label={`${a} axis name`}
                  onChange={(e) => set({ [`${a}Label`]: e.target.value })} />
                <BoundInput label={`${a} from`} value={graph[`${a}Min`]} onChange={(v) => set({ [`${a}Min`]: v })} />
                <span className="graph-axis-to">to</span>
                <BoundInput label={`${a} to`} value={graph[`${a}Max`]} onChange={(v) => set({ [`${a}Max`]: v })} />
              </div>
            ))}
            <label className="graph-check"><input type="checkbox" checked={graph.line} onChange={(e) => set({ line: e.target.checked })} />Join the points in order</label>
          </section>
          <section className="graph-sec graph-sec-wide">
            <h4 className="graph-sec-title">Lines, arrows and vectors <span>draw them on the graph; ends are a point (P1) or x, y; lower in the list is drawn on top</span></h4>
            {graph.marks.length ? (
              <ol className="graph-marks">
                {graph.marks.map((m, i) => (
                  <li key={i} className={`graph-mark${picked === i ? " is-picked" : ""}`} onFocus={() => setPicked(i)}>
                    <Dropdown compact label="Kind" value={m.kind} onChange={(kind) => set(changeMark(i, { kind }), true)}
                      options={markKinds.map((k) => ({ value: k, label: k[0].toUpperCase() + k.slice(1), icon: <Icon name={k === "line" ? "lineTool" : k === "arrow" ? "arrowTool" : "vectorTool"} /> }))} />
                    <EndInput label="From" value={m.from} points={graph.points} onChange={(from) => set(changeMark(i, { from }))} />
                    <span className="graph-mark-to" aria-hidden="true">→</span>
                    <EndInput label="To" value={m.to} points={graph.points} onChange={(to) => set(changeMark(i, { to }))} />
                    <input className="input graph-mark-label" value={m.label ?? ""} placeholder="Label" aria-label="Label"
                      onChange={(e) => set(changeMark(i, { label: e.target.value || undefined }))} />
                    <Swatches value={m.colour} onChange={(colour) => set(changeMark(i, { colour }), true)} />
                    <button type="button" className={`tool${m.shadow ? " is-on" : ""}`} aria-pressed={!!m.shadow} aria-label="Shadow" title="Shadow: an outline that keeps it clear of lines it crosses"
                      onClick={() => set(changeMark(i, { shadow: !m.shadow || undefined }), true)}><Icon name="shadow" /></button>
                    <button type="button" className="tool" aria-label="Bring to front" title="Bring to front" disabled={i === graph.marks.length - 1}
                      onClick={() => { set({ marks: [...graph.marks.filter((_, j) => j !== i), m] }, true); setPicked(graph.marks.length - 1); }}><Icon name="front" /></button>
                    <button type="button" className="tool tool-danger" aria-label="Delete line" title="Delete" onClick={() => deleteMark(i)}><Icon name="trash" /></button>
                  </li>
                ))}
              </ol>
            ) : <p className="graph-none">None yet. Pick Line, Arrow or Vector above the graph.</p>}
          </section>
          <footer className="graph-foot">
            <button type="button" className="btn-link danger" onClick={remove}>Delete graph</button>
            <button type="button" className="btn btn-sm" onClick={close}>Done</button>
          </footer>
        </div>
      ) : !graph.points.length && !graph.marks.length && <p className="cell-empty graph-empty">Nothing on it yet. Click to add points and lines.</p>}
      <input className="media-caption" value={caption} placeholder="Add a caption" aria-label="Caption" onChange={(e) => updateAttributes({ caption: e.target.value })} />
    </NodeViewWrapper>
  );
}

// The colour of a line: its kind's own (the first swatch), or one from the palette.
function Swatches({ value, onChange }: { value: Colour | undefined; onChange: (c: Colour | undefined) => void }) {
  return (
    <span className="swatches" role="radiogroup" aria-label="Colour">
      <button type="button" role="radio" aria-checked={!value} aria-label="Default colour" title="Default" className={`swatch swatch-default${!value ? " is-on" : ""}`} onClick={() => onChange(undefined)} />
      {colours.map((c) => (
        <button key={c} type="button" role="radio" aria-checked={value === c} aria-label={c} title={c} className={`swatch d-${c}${value === c ? " is-on" : ""}`} onClick={() => onChange(c)} />
      ))}
    </span>
  );
}

// One end of a line, typed: "P2" or "x, y". Kept as typed until it reads as an end.
function EndInput({ label, value, points, onChange }: { label: string; value: End; points: Graph["points"]; onChange: (e: End) => void }) {
  const [text, setText] = useState<string | null>(null);
  const bad = text !== null && !parseEnd(text, points);
  return (
    <input className={`input graph-end${bad ? " is-bad" : ""}`} value={text ?? endText(value)} aria-label={label} aria-invalid={bad} placeholder="P1 or x, y"
      onChange={(e) => { setText(e.target.value); const end = parseEnd(e.target.value, points); if (end) onChange(end); }} onBlur={() => setText(null)} />
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
    // While it's being edited, pointer and key events on the graph and its panel are its own, not the note's.
    return ReactNodeViewRenderer(GraphView, { stopEvent: ({ event }) => !!(event.target instanceof Element && event.target.closest(".note-graph.is-editing")) });
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
