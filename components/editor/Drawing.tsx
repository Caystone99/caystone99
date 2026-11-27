"use client";

import { Node } from "@tiptap/core";
import { closeHistory } from "@tiptap/pm/history";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { useId, useRef, useState } from "react";
import { bounds, colours, drawingSvg, emptyDrawing, inside, limits, move, newId, readDrawing, shapeSvg, type Colour, type Drawing, type Shape } from "@/lib/drawing";
import { useEditing } from "./cells";
import { Icon, type IconName } from "./icons";

type Tool = "select" | "rect" | "ellipse" | "line" | "arrow" | "pen" | "text";
type Handle = "nw" | "ne" | "sw" | "se" | "p1" | "p2";
// What the pointer is doing between pressing and letting go.
type Gesture =
  | { type: "draw"; x0: number; y0: number }
  | { type: "move"; x0: number; y0: number; start: Shape }
  | { type: "resize"; handle: Handle; start: Shape };

const tools: { key: Tool; label: string; icon: IconName; keys: string }[] = [
  { key: "select", label: "Select and move", icon: "select", keys: "V" },
  { key: "rect", label: "Rectangle", icon: "rect", keys: "R" },
  { key: "ellipse", label: "Ellipse", icon: "ellipse", keys: "O" },
  { key: "line", label: "Line", icon: "lineTool", keys: "L" },
  { key: "arrow", label: "Arrow", icon: "arrowTool", keys: "A" },
  { key: "pen", label: "Pen", icon: "pen", keys: "P" },
  { key: "text", label: "Text", icon: "textTool", keys: "T" },
];
const GRID = 10;

function DrawingView({ node, updateAttributes, selected, editor, getPos }: ReactNodeViewProps) {
  const stored = readDrawing(node.attrs.drawing);
  const caption = node.attrs.caption as string;
  const { editing, setEditing, root, close, remove } = useEditing({ editor, selected, empty: !stored.shapes.length && !caption, getPos, size: node.nodeSize });
  // While the pointer is down, changes are kept here and saved when it's let go: one undo step per stroke or move.
  const [draft, setDraft] = useState<Drawing | null>(null);
  const d = draft ?? stored;
  const [tool, setTool] = useState<Tool>("select");
  const [colour, setColour] = useState<Colour>("ink");
  const [grid, setGrid] = useState(true);
  const [picked, setPicked] = useState<string | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const words = useRef<HTMLTextAreaElement>(null);
  const gridId = `grid${useId().replace(/\W/g, "")}`;
  const sel = d.shapes.find((s) => s.id === picked) ?? null;

  // Each stroke, move or arrangement is its own undo step. Typing in the panel (`step` false) undoes in runs, like
  // writing does.
  const save = (next: Drawing, step = true) => {
    const pos = getPos();
    if (typeof pos !== "number") return;
    const tr = editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, drawing: next });
    editor.view.dispatch(step ? closeHistory(tr) : tr);
  };
  const snap = (v: number) => (grid ? Math.round(v / GRID) * GRID : v);
  const change = (id: string, f: (s: Shape) => Shape, base = d) => ({ ...base, shapes: base.shapes.map((s) => (s.id === id ? f(s) : s)) });
  const edit = (patch: Partial<Shape>, step = true) => sel && save(change(sel.id, (s) => ({ ...s, ...patch }) as Shape), step);

  // Choosing another shape (or none) clears away a text box left empty.
  function pick(id: string | null, base = d) {
    const was = base.shapes.find((s) => s.id === picked);
    if (was && was.id !== id && was.kind === "text" && !was.text.trim()) save({ ...base, shapes: base.shapes.filter((s) => s.id !== was.id) });
    setPicked(id);
  }

  // The pointer, in the drawing's own units, kept inside the boundary.
  function at(e: React.PointerEvent) {
    const m = svg.current!.getScreenCTM()!.inverse();
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    return inside(p.x, p.y, d);
  }

  // The topmost shape under the pointer. Thin lines and unfilled shapes are found by their box, a little enlarged.
  function hit(x: number, y: number) {
    for (const s of [...d.shapes].reverse()) {
      const b = bounds(s);
      if (x >= b.x - 6 && x <= b.x + b.w + 6 && y >= b.y - 6 && y <= b.y + b.h + 6) return s;
    }
    return null;
  }

  function down(e: React.PointerEvent<SVGSVGElement>) {
    e.preventDefault();
    svg.current!.focus({ preventScroll: true });
    svg.current!.setPointerCapture(e.pointerId);
    const { x, y } = at(e);
    const handle = (e.target as Element).closest("[data-handle]")?.getAttribute("data-handle") as Handle | null;
    if (handle && sel) {
      gesture.current = { type: "resize", handle, start: sel };
      return setDraft(d);
    }
    if (tool === "select") {
      const s = hit(x, y);
      pick(s?.id ?? null);
      if (s) { gesture.current = { type: "move", x0: x, y0: y, start: s }; setDraft(d); }
      return;
    }
    const base = { id: newId(), colour, shadow: false };
    if (tool === "text") {
      const next = { ...d, shapes: [...d.shapes, { ...base, kind: "text" as const, x: snap(x), y: snap(y), text: "", size: 18 }] };
      save(next);
      pick(base.id, next);
      setTool("select");
      // The words are typed in the panel, which opens for the new text.
      requestAnimationFrame(() => words.current?.focus());
      return;
    }
    const sx = snap(x), sy = snap(y);
    const shape: Shape = tool === "pen" ? { ...base, kind: "pen", points: [[x, y]] }
      : tool === "line" || tool === "arrow" ? { ...base, kind: tool, x1: sx, y1: sy, x2: sx, y2: sy, dashed: false }
      : { ...base, kind: tool, x: sx, y: sy, w: 0, h: 0, fill: false, label: "" };
    gesture.current = { type: "draw", x0: sx, y0: sy };
    setDraft({ ...d, shapes: [...d.shapes, shape] });
    setPicked(base.id);
  }

  function drag(e: React.PointerEvent<SVGSVGElement>) {
    const g = gesture.current;
    if (!g || !draft || !sel) return;
    const { x, y } = at(e);
    if (g.type === "draw") {
      setDraft(change(sel.id, (s) => {
        if (s.kind === "pen") {
          const [lx, ly] = s.points[s.points.length - 1];
          return Math.hypot(x - lx, y - ly) < 2 ? s : { ...s, points: [...s.points, [x, y]] };
        }
        if (s.kind === "line" || s.kind === "arrow") return { ...s, x2: snap(x), y2: snap(y) };
        if (s.kind === "rect" || s.kind === "ellipse") {
          // Shift keeps it square, or round.
          let w = snap(x) - g.x0, h = snap(y) - g.y0;
          if (e.shiftKey) { const m = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w || 1) * m; h = Math.sign(h || 1) * m; }
          const b = { x: Math.min(g.x0, g.x0 + w), y: Math.min(g.y0, g.y0 + h), w: Math.abs(w), h: Math.abs(h) };
          return { ...s, ...b, w: Math.min(b.w, d.width - b.x), h: Math.min(b.h, d.height - b.y) };
        }
        return s;
      }, draft));
    } else if (g.type === "move") {
      const b = bounds(g.start);
      // With the grid on, the shape's corner lands on the grid.
      const dx = grid ? snap(b.x + x - g.x0) - b.x : x - g.x0;
      const dy = grid ? snap(b.y + y - g.y0) - b.y : y - g.y0;
      setDraft(change(sel.id, () => move(g.start, dx, dy, d), draft));
    } else {
      const s = g.start, px = snap(x), py = snap(y);
      setDraft(change(sel.id, () => {
        if ((s.kind === "line" || s.kind === "arrow") && (g.handle === "p1" || g.handle === "p2")) return g.handle === "p1" ? { ...s, x1: px, y1: py } : { ...s, x2: px, y2: py };
        if (s.kind !== "rect" && s.kind !== "ellipse") return s;
        // The corner opposite the one being dragged stays where it is.
        const fx = g.handle.includes("w") ? s.x + s.w : s.x, fy = g.handle.includes("n") ? s.y + s.h : s.y;
        return { ...s, x: Math.min(fx, px), y: Math.min(fy, py), w: Math.max(1, Math.abs(px - fx)), h: Math.max(1, Math.abs(py - fy)) };
      }, draft));
    }
  }

  function up() {
    const g = gesture.current;
    gesture.current = null;
    if (!g || !draft) return;
    let next = draft;
    // A click without a drag doesn't leave a dot behind.
    const made = next.shapes.find((s) => s.id === picked);
    if (g.type === "draw" && made) {
      const b = bounds(made);
      if (b.w < 4 && b.h < 4) { next = { ...next, shapes: next.shapes.filter((s) => s.id !== made.id) }; setPicked(null); }
      else if (tool !== "pen") setTool("select");
    }
    setDraft(null);
    if (JSON.stringify(next) !== JSON.stringify(stored)) save(next);
  }

  // Arranging: front and back, one step at a time or all the way.
  function arrange(to: "front" | "back" | "forward" | "backward") {
    if (!sel) return;
    const list = d.shapes.filter((s) => s.id !== sel.id), i = d.shapes.indexOf(sel);
    const at = to === "front" ? list.length : to === "back" ? 0 : to === "forward" ? Math.min(list.length, i + 1) : Math.max(0, i - 1);
    list.splice(at, 0, sel);
    save({ ...d, shapes: list });
  }

  function duplicate() {
    if (!sel) return;
    const copy = { ...move(sel, GRID * 2, GRID * 2, d), id: newId() };
    save({ ...d, shapes: [...d.shapes, copy] });
    setPicked(copy.id);
  }

  function erase() {
    if (!sel) return;
    save({ ...d, shapes: d.shapes.filter((s) => s.id !== sel.id) });
    setPicked(null);
  }

  function keys(e: React.KeyboardEvent<SVGSVGElement>) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if ((k === "Backspace" || k === "Delete") && sel) { e.preventDefault(); return erase(); }
    if (k.startsWith("Arrow") && sel) {
      e.preventDefault();
      const by = e.shiftKey ? GRID : 1;
      return save(change(sel.id, (s) => move(s, k === "ArrowLeft" ? -by : k === "ArrowRight" ? by : 0, k === "ArrowUp" ? -by : k === "ArrowDown" ? by : 0, d)));
    }
    if (k === "Escape") { e.preventDefault(); return sel ? pick(null) : close(); }
    const t = tools.find((t) => t.keys.toLowerCase() === k.toLowerCase());
    if (t) { e.preventDefault(); setTool(t.key); }
  }

  function resize(width: number, height: number) {
    const size = { width: Math.round(Math.min(limits.max, Math.max(limits.min, width))), height: Math.round(Math.min(limits.max, Math.max(limits.min, height))) };
    // Shapes are brought back inside a smaller boundary.
    save({ ...d, ...size, shapes: d.shapes.map((s) => move(s, 0, 0, size)) });
  }

  if (!editing) {
    return (
      <NodeViewWrapper as="figure" ref={root} className="note-drawing" data-drag-handle="">
        <div className="drawing-show" onClick={() => setEditing(true)} title="Click to edit" dangerouslySetInnerHTML={{ __html: drawingSvg(d) }} />
        {!d.shapes.length && <p className="cell-empty graph-empty">Nothing drawn yet. Click to draw.</p>}
        {caption && <figcaption>{caption}</figcaption>}
      </NodeViewWrapper>
    );
  }

  const b = sel && bounds(sel);
  const handles: [Handle, number, number][] = !sel ? []
    : sel.kind === "line" || sel.kind === "arrow" ? [["p1", sel.x1, sel.y1], ["p2", sel.x2, sel.y2]]
    : sel.kind === "rect" || sel.kind === "ellipse" ? [["nw", sel.x, sel.y], ["ne", sel.x + sel.w, sel.y], ["sw", sel.x, sel.y + sel.h], ["se", sel.x + sel.w, sel.y + sel.h]]
    : [];
  const num = (v: number) => Math.round(v);

  return (
    <NodeViewWrapper as="figure" ref={root} className="note-drawing is-editing">
      <div className="drawing-edit">
        <div className="drawing-bar" role="toolbar" aria-label="Drawing">
          {tools.map((t) => (
            <button key={t.key} type="button" className={`tool${tool === t.key ? " is-on" : ""}`} aria-pressed={tool === t.key} aria-label={t.label} title={`${t.label} (${t.keys})`}
              onClick={() => setTool(t.key)}>
              <Icon name={t.icon} />
            </button>
          ))}
          <span className="toolbar-sep" />
          <span className="drawing-colours" role="radiogroup" aria-label="Colour">
            {colours.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={(sel?.colour ?? colour) === c} aria-label={c} title={c}
                className={`drawing-swatch d-${c}${(sel?.colour ?? colour) === c ? " is-on" : ""}`}
                onClick={() => { setColour(c); edit({ colour: c }); }} />
            ))}
          </span>
          <span className="toolbar-sep" />
          <button type="button" className={`tool${grid ? " is-on" : ""}`} aria-pressed={grid} aria-label="Snap to grid" title="Snap to grid" onClick={() => setGrid(!grid)}><Icon name="grid" /></button>
          <span className="drawing-size" title="The drawing's boundary">
            <SizeInput label="Width" value={d.width} onChange={(w) => resize(w, d.height)} />×<SizeInput label="Height" value={d.height} onChange={(h) => resize(d.width, h)} />
          </span>
          <span className="toolbar-push" />
          <span className="cell-actions">
            <button type="button" className="btn btn-sm" onClick={() => { pick(null); close(); }}>Done</button>
            <button type="button" className="tool" aria-label="Delete drawing" title="Delete drawing" onClick={remove}><Icon name="trash" /></button>
          </span>
        </div>

        <svg ref={svg} className={`drawing drawing-canvas tool-${tool}`} viewBox={`0 0 ${d.width} ${d.height}`} tabIndex={0} aria-label="Drawing canvas"
          onPointerDown={down} onPointerMove={drag} onPointerUp={up} onPointerCancel={up} onKeyDown={keys} onDragStart={(e) => e.preventDefault()}
          onDoubleClick={() => sel && (sel.kind === "text" || sel.kind === "rect" || sel.kind === "ellipse") && words.current?.focus()}>
          {grid && (
            <>
              <defs><pattern id={gridId} width={GRID * 2} height={GRID * 2} patternUnits="userSpaceOnUse"><circle cx={1} cy={1} r={1} className="d-grid" /></pattern></defs>
              <rect width={d.width} height={d.height} fill={`url(#${gridId})`} />
            </>
          )}
          <g dangerouslySetInnerHTML={{ __html: d.shapes.map((s) => shapeSvg(s, ` data-id="${s.id}"`)).join("") }} />
          {b && sel && (
            <g className="d-selection">
              <rect x={b.x - 4} y={b.y - 4} width={b.w + 8} height={b.h + 8} />
              {handles.map(([h, x, y]) => <circle key={h} data-handle={h} cx={x} cy={y} r={6} className={`d-handle d-handle-${h}`} />)}
            </g>
          )}
        </svg>

        <div className="drawing-panel">
          {sel ? (
            <>
              {(sel.kind === "text" || sel.kind === "rect" || sel.kind === "ellipse") && (
                <label className="field drawing-words">
                  <span className="label">{sel.kind === "text" ? "Text" : "Label inside"}</span>
                  <textarea ref={words} className="input" rows={2} value={sel.kind === "text" ? sel.text : sel.label} placeholder={sel.kind === "text" ? "Type here" : "Optional"}
                    onChange={(e) => edit(sel.kind === "text" ? { text: e.target.value } : { label: e.target.value }, false)}
                    onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); svg.current?.focus(); } }} />
                </label>
              )}
              <span className="drawing-fields">
                <NumberField label="X" value={num(b!.x)} onChange={(v) => save(change(sel.id, (s) => move(s, v - b!.x, 0, d)), false)} />
                <NumberField label="Y" value={num(b!.y)} onChange={(v) => save(change(sel.id, (s) => move(s, 0, v - b!.y, d)), false)} />
                {(sel.kind === "rect" || sel.kind === "ellipse") && (
                  <>
                    <NumberField label="W" value={num(sel.w)} onChange={(v) => edit({ w: Math.max(1, Math.min(v, d.width - sel.x)) }, false)} />
                    <NumberField label="H" value={num(sel.h)} onChange={(v) => edit({ h: Math.max(1, Math.min(v, d.height - sel.y)) }, false)} />
                  </>
                )}
                {sel.kind === "text" && <NumberField label="Size" value={sel.size} onChange={(v) => edit({ size: Math.max(8, Math.min(96, v)) }, false)} />}
              </span>
              <span className="drawing-actions">
                {(sel.kind === "rect" || sel.kind === "ellipse") && (
                  <button type="button" className={`tool${sel.fill ? " is-on" : ""}`} aria-pressed={sel.fill} aria-label="Fill" title="Fill" onClick={() => edit({ fill: !sel.fill })}><Icon name="fill" /></button>
                )}
                {(sel.kind === "line" || sel.kind === "arrow") && (
                  <button type="button" className={`tool${sel.dashed ? " is-on" : ""}`} aria-pressed={sel.dashed} aria-label="Dashed" title="Dashed" onClick={() => edit({ dashed: !sel.dashed })}><Icon name="dashed" /></button>
                )}
                <button type="button" className={`tool${sel.shadow ? " is-on" : ""}`} aria-pressed={sel.shadow} aria-label="Shadow" title="Shadow: sets it apart from what's under it"
                  onClick={() => edit({ shadow: !sel.shadow })}><Icon name="shadow" /></button>
                <button type="button" className="tool" aria-label="Bring to front" title="Bring to front" onClick={() => arrange("front")}><Icon name="front" /></button>
                <button type="button" className="tool" aria-label="Bring forward" title="Bring forward" onClick={() => arrange("forward")}><Icon name="forward" /></button>
                <button type="button" className="tool" aria-label="Send backward" title="Send backward" onClick={() => arrange("backward")}><Icon name="backward" /></button>
                <button type="button" className="tool" aria-label="Send to back" title="Send to back" onClick={() => arrange("back")}><Icon name="back" /></button>
                <button type="button" className="tool" aria-label="Duplicate" title="Duplicate" onClick={duplicate}><Icon name="copy" /></button>
                <button type="button" className="tool tool-danger" aria-label="Delete shape" title="Delete shape (Backspace)" onClick={erase}><Icon name="trash" /></button>
              </span>
            </>
          ) : (
            <p className="drawing-hint">
              Pick a tool and drag on the canvas. Shift keeps shapes square. With the select tool, drag shapes to move them, use the handles to resize,
              and arrow keys to nudge. Shapes stay inside the boundary.
            </p>
          )}
        </div>
      </div>
      <input className="media-caption" value={caption} placeholder="Add a caption" aria-label="Caption" onChange={(e) => updateAttributes({ caption: e.target.value })} />
    </NodeViewWrapper>
  );
}

// A number typed in, saved once it reads as one, so a field can be cleared and retyped.
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [text, setText] = useState<string | null>(null);
  return (
    <label className="drawing-number">
      <span>{label}</span>
      <input className="input" inputMode="decimal" value={text ?? String(value)} aria-label={label}
        onChange={(e) => { setText(e.target.value); if (e.target.value.trim() && Number.isFinite(Number(e.target.value))) onChange(Number(e.target.value)); }}
        onBlur={() => setText(null)} />
    </label>
  );
}

// One side of the boundary. Applied when the field is left or Enter pressed, so typing "4" on the way to "400"
// doesn't squash the drawing.
function SizeInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [text, setText] = useState<string | null>(null);
  const apply = () => { if (text !== null && Number.isFinite(Number(text)) && text.trim()) onChange(Number(text)); setText(null); };
  return (
    <input className="input drawing-size-input" inputMode="numeric" aria-label={`${label} of the drawing`} title={`${label} (${limits.min} to ${limits.max})`} value={text ?? String(value)}
      onChange={(e) => setText(e.target.value)} onBlur={apply} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } }} />
  );
}

// Shapes drawn inside a boundary of a set size. Stored as data; drawn the same way here and on the site.
export const DrawingBlock = Node.create({
  name: "drawing",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return { drawing: { default: emptyDrawing }, caption: { default: "" } };
  },
  parseHTML: () => [{
    tag: "figure.note-drawing",
    getAttrs: (el) => {
      try { return { drawing: readDrawing(JSON.parse(el.getAttribute("data-drawing") ?? "{}")), caption: el.querySelector("figcaption")?.textContent ?? "" }; }
      catch { return { drawing: emptyDrawing, caption: "" }; }
    },
  }],
  renderHTML({ node }) {
    const d = readDrawing(node.attrs.drawing);
    // Empty text boxes aren't kept.
    const attrs = { class: "note-drawing", "data-drawing": JSON.stringify({ ...d, shapes: d.shapes.filter((s) => s.kind !== "text" || s.text.trim()) }) };
    return node.attrs.caption ? ["figure", attrs, ["figcaption", {}, node.attrs.caption]] : ["figure", attrs];
  },
  addNodeView() {
    // Pointer and key events on the canvas and its panel are the drawing's own, not the note's.
    return ReactNodeViewRenderer(DrawingView, { stopEvent: ({ event }) => !!(event.target instanceof Element && event.target.closest(".drawing-edit")) });
  },
});
