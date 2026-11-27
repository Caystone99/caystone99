import { arrowHead, escape, fixed, shorten } from "./svg";

// Points on a graph, drawn as SVG. The editor and the published note both draw with graphSvg, so a graph looks
// the same in each. Colours come from CSS classes (g-*), which follow the light and dark themes.
export type Point = { x: number; y: number; label?: string };
// Lines, arrows and vectors. Each end is either one of the points (by its place in the list, so it moves with
// the point) or a free position on the graph.
export type End = { point: number } | { x: number; y: number };
export type Mark = { kind: "line" | "arrow" | "vector"; from: End; to: End; label?: string };
export const markKinds = ["line", "arrow", "vector"] as const;
// Bounds left empty (null) follow the points; set ones fix that edge of the graph.
export type Bounds = { xMin: number | null; xMax: number | null; yMin: number | null; yMax: number | null };
export type Graph = { points: Point[]; marks: Mark[]; line: boolean; xLabel: string; yLabel: string } & Bounds;

export const emptyGraph: Graph = { points: [], marks: [], line: false, xLabel: "", yLabel: "", xMin: null, xMax: null, yMin: null, yMax: null };

export const W = 640, H = 400;
const pad = { left: 58, right: 20, top: 18, bottom: 48 };

// A graph from what was stored, dropping anything that isn't a finite point.
export function readGraph(value: unknown): Graph {
  const g = (value && typeof value === "object" ? value : {}) as Partial<Graph>;
  const points = (Array.isArray(g.points) ? g.points : [])
    .map((p) => ({ x: Number(p?.x), y: Number(p?.y), ...(p?.label ? { label: String(p.label).slice(0, 60) } : {}) }))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
    .slice(0, 500);
  const bound = (v: unknown) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
  // An end pointing at a point that's gone, or at no finite place, drops its mark.
  const end = (e: unknown): End | null => {
    const v = (e && typeof e === "object" ? e : {}) as Record<string, unknown>;
    if ("point" in v) return Number.isInteger(v.point) && (v.point as number) >= 0 && (v.point as number) < points.length ? { point: v.point as number } : null;
    const x = Number(v.x), y = Number(v.y);
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
  };
  const marks = (Array.isArray(g.marks) ? g.marks : []).flatMap((m): Mark[] => {
    const from = end(m?.from), to = end(m?.to);
    if (!from || !to || !markKinds.includes(m.kind)) return [];
    return [{ kind: m.kind, from, to, ...(m.label ? { label: String(m.label).slice(0, 40) } : {}) }];
  }).slice(0, 100);
  return {
    points, marks, line: !!g.line, xLabel: String(g.xLabel ?? "").slice(0, 80), yLabel: String(g.yLabel ?? "").slice(0, 80),
    xMin: bound(g.xMin), xMax: bound(g.xMax), yMin: bound(g.yMin), yMax: bound(g.yMax),
  };
}

// "x, y" or "x, y, label" on each line; blank and unreadable lines are skipped.
export function parsePoints(text: string): Point[] {
  return text.split("\n").flatMap((line) => {
    const [x, y, ...label] = line.split(/[,\t]|\s{2,}/).map((s) => s.trim());
    const p = { x: Number(x), y: Number(y) };
    if (!x || !y || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return [];
    return [label.join(", ") ? { ...p, label: label.join(", ") } : p];
  });
}

// "arrow P1 -> P3 force", "line 0, 0 -> 2, 4" or "vector 0,0 -> 3,4 v", one per line. Pn is the nth point;
// anything else is x, y. Lines that can't be read are skipped.
const numPattern = String.raw`-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?`;
const endPattern = String.raw`(p\d+|${numPattern}\s*,\s*${numPattern})`;
const markLine = new RegExp(String.raw`^\s*(line|arrow|vector)\s+${endPattern}\s*->\s*${endPattern}\s*(.*)$`, "i");

export function parseMarks(text: string, points: Point[]): Mark[] {
  const end = (s: string): End | null => {
    const p = /^p(\d+)$/i.exec(s.trim());
    if (p) return Number(p[1]) >= 1 && Number(p[1]) <= points.length ? { point: Number(p[1]) - 1 } : null;
    const [x, y] = s.split(",").map((v) => Number(v.trim()));
    return { x, y };
  };
  return text.split("\n").flatMap((l) => {
    const m = markLine.exec(l);
    const from = m && end(m[2]), to = m && end(m[3]);
    if (!m || !from || !to) return [];
    return [{ kind: m[1].toLowerCase() as Mark["kind"], from, to, ...(m[4].trim() ? { label: m[4].trim() } : {}) }];
  });
}

const endText = (e: End) => ("point" in e ? `P${e.point + 1}` : `${e.x}, ${e.y}`);
export const marksText = (marks: Mark[]) => marks.map((m) => `${m.kind} ${endText(m.from)} -> ${endText(m.to)}${m.label ? ` ${m.label}` : ""}`).join("\n");

// Where an end is, in the graph's numbers.
export const at = (g: Graph, e: End): { x: number; y: number } | undefined => ("point" in e ? g.points[e.point] : e);

export const pointsText = (points: Point[]) => points.map((p) => [p.x, p.y, p.label].filter((v) => v !== undefined && v !== "").join(", ")).join("\n");

// Round, evenly spaced ticks (1, 2 or 5 times a power of ten) that cover [min, max].
function ticks(min: number, max: number, count: number) {
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const start = Math.floor(min / step) * step, end = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) out.push(Number(v.toPrecision(12)));
  return { values: out, step };
}

// One axis: its ends and ticks. A set bound is used exactly; an open end is rounded out to the next tick.
function axis(values: number[], lo: number | null, hi: number | null, count: number) {
  // Bounds the wrong way round, or equal, are ignored.
  if (lo !== null && hi !== null && lo >= hi) lo = hi = null;
  let min = lo ?? (values.length ? Math.min(...values) : 0);
  let max = hi ?? (values.length ? Math.max(...values) : 10);
  if (min >= max) {
    if (lo === null) min = max - (hi === null ? 1 : Math.max(1, Math.abs(max)));
    if (hi === null) max = min + (lo === null ? 2 : Math.max(1, Math.abs(min)));
  }
  const t = ticks(min, max, count);
  if (lo === null) min = t.values[0];
  if (hi === null) max = t.values[t.values.length - 1];
  const near = t.step * 1e-9;
  return { min, max, step: t.step, values: t.values.filter((v) => v >= min - near && v <= max + near) };
}

// Where everything goes: the axes' ticks and the functions between data and drawing.
export function layout(g: Graph) {
  // Free ends of lines and arrows count too, so an open axis stretches to show them.
  const free = g.marks.flatMap((m) => [m.from, m.to]).filter((e): e is { x: number; y: number } => !("point" in e));
  const xt = axis([...g.points, ...free].map((p) => p.x), g.xMin, g.xMax, 8);
  const yt = axis([...g.points, ...free].map((p) => p.y), g.yMin, g.yMax, 6);
  const [x0, x1, y0, y1] = [xt.min, xt.max, yt.min, yt.max];
  const sx = (x: number) => pad.left + ((x - x0) / (x1 - x0)) * (W - pad.left - pad.right);
  const sy = (y: number) => H - pad.bottom - ((y - y0) / (y1 - y0)) * (H - pad.top - pad.bottom);
  // Back from drawing to data, rounded to a tenth of a tick, for clicking a point in.
  const round = (v: number, step: number) => Number((Math.round(v / (step / 10)) * (step / 10)).toPrecision(10));
  const invert = (px: number, py: number) => ({
    x: round(x0 + ((px - pad.left) / (W - pad.left - pad.right)) * (x1 - x0), xt.step),
    y: round(y0 + ((H - pad.bottom - py) / (H - pad.top - pad.bottom)) * (y1 - y0), yt.step),
  });
  return { xt, yt, x0, x1, y0, y1, sx, sy, invert };
}

// While writing: the points numbered (P1, P2…) for typing lines and arrows, and where a line being drawn starts.
type Extras = { numbers?: boolean; pending?: { x: number; y: number } };

const num = (v: number) => (Math.abs(v) >= 1e5 || (v !== 0 && Math.abs(v) < 1e-3) ? v.toExponential(1) : String(Number(v.toPrecision(6))));

export function graphSvg(g: Graph, extras: Extras = {}) {
  const { xt, yt, x0, x1, y0, y1, sx, sy } = layout(g);
  const left = pad.left, right = W - pad.right, top = pad.top, bottom = H - pad.bottom;
  const parts: string[] = [];
  for (const v of xt.values) parts.push(`<line class="g-grid" x1="${sx(v)}" y1="${top}" x2="${sx(v)}" y2="${bottom}"/><text class="g-tick" x="${sx(v)}" y="${bottom + 18}" text-anchor="middle">${num(v)}</text>`);
  for (const v of yt.values) parts.push(`<line class="g-grid" x1="${left}" y1="${sy(v)}" x2="${right}" y2="${sy(v)}"/><text class="g-tick" x="${left - 8}" y="${sy(v) + 4}" text-anchor="end">${num(v)}</text>`);
  // The axes through zero, when zero is in view.
  if (x0 <= 0 && x1 >= 0) parts.push(`<line class="g-zero" x1="${sx(0)}" y1="${top}" x2="${sx(0)}" y2="${bottom}"/>`);
  if (y0 <= 0 && y1 >= 0) parts.push(`<line class="g-zero" x1="${left}" y1="${sy(0)}" x2="${right}" y2="${sy(0)}"/>`);
  parts.push(`<rect class="g-frame" x="${left}" y="${top}" width="${right - left}" height="${bottom - top}"/>`);
  // Inner frames cut off anything past the bounds: the line exactly at the plot's edge, the points a little
  // outside it, so a point on an edge stays whole.
  const frame = (m: number, inner: string) => {
    const fw = right - left + 2 * m, fh = bottom - top + 2 * m;
    return `<svg x="${left - m}" y="${top - m}" width="${fw}" height="${fh}" viewBox="${left - m} ${top - m} ${fw} ${fh}">${inner}</svg>`;
  };
  const plot: string[] = [];
  if (g.line && g.points.length > 1) {
    const sorted = [...g.points].sort((a, b) => a.x - b.x);
    parts.push(frame(0, `<path class="g-line" d="${sorted.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join("")}"/>`));
  }
  const labels: string[] = [];
  // Lines, arrows and vectors, under the points they join.
  for (const m of g.marks) {
    const a = at(g, m.from), b = at(g, m.to);
    if (!a || !b) continue;
    const ax = sx(a.x), ay = sy(a.y), bx = sx(b.x), by = sy(b.y);
    const head = m.kind === "line" ? 0 : m.kind === "vector" ? 12 : 10;
    const tip = head ? shorten(ax, ay, bx, by, head * 0.8) : { x: bx, y: by };
    plot.push(`<g class="g-mark is-${m.kind}"><line x1="${fixed(ax)}" y1="${fixed(ay)}" x2="${fixed(tip.x)}" y2="${fixed(tip.y)}"/>${head ? `<polygon points="${arrowHead(ax, ay, bx, by, head)}"/>` : ""}</g>`);
    if (m.label) {
      // Beside the middle of the line, off to one side of it.
      const len = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / len, ny = (bx - ax) / len;
      labels.push(`<text class="g-marklabel is-${m.kind}" x="${fixed((ax + bx) / 2 + nx * 12)}" y="${fixed((ay + by) / 2 + ny * 12 + 4)}" text-anchor="middle">${escape(m.label)}</text>`);
    }
  }
  if (extras.numbers) {
    for (const [i, p] of g.points.entries()) labels.push(`<text class="g-num" x="${fixed(sx(p.x) - 7)}" y="${fixed(sy(p.y) + 16)}" text-anchor="end">P${i + 1}</text>`);
  }
  if (extras.pending) plot.push(`<circle class="g-pending" cx="${fixed(sx(extras.pending.x))}" cy="${fixed(sy(extras.pending.y))}" r="7"/>`);
  for (const p of g.points) {
    const cx = sx(p.x), cy = sy(p.y);
    plot.push(`<circle class="g-point" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4.5"><title>${escape(`(${num(p.x)}, ${num(p.y)})${p.label ? ` ${p.label}` : ""}`)}</title></circle>`);
    if (!p.label || p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
    // Labels near the right or top edge go on the other side of their point, so they stay inside.
    const flip = cx > right - 90;
    labels.push(`<text class="g-pointlabel" x="${(cx + (flip ? -8 : 8)).toFixed(1)}" y="${Math.max(top + 12, cy - 8).toFixed(1)}"${flip ? ' text-anchor="end"' : ""}>${escape(p.label)}</text>`);
  }
  parts.push(frame(6, plot.join("")), ...labels);
  if (g.xLabel) parts.push(`<text class="g-label" x="${(left + right) / 2}" y="${H - 6}" text-anchor="middle">${escape(g.xLabel)}</text>`);
  if (g.yLabel) parts.push(`<text class="g-label" transform="translate(14 ${(top + bottom) / 2}) rotate(-90)" text-anchor="middle">${escape(g.yLabel)}</text>`);
  const summary = `Graph of ${g.points.length} point${g.points.length === 1 ? "" : "s"}${g.marks.length ? ` and ${g.marks.length} line${g.marks.length === 1 ? "" : "s"}` : ""}${g.xLabel || g.yLabel ? `: ${g.yLabel || "y"} against ${g.xLabel || "x"}` : ""}`;
  return `<svg class="graph" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escape(summary)}">${parts.join("")}</svg>`;
}
