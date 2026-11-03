// Points on a graph, drawn as SVG. The editor and the published note both draw with graphSvg, so a graph looks
// the same in each. Colours come from CSS classes (g-*), which follow the light and dark themes.
export type Point = { x: number; y: number; label?: string };
export type Graph = { points: Point[]; line: boolean; xLabel: string; yLabel: string };

export const emptyGraph: Graph = { points: [], line: false, xLabel: "", yLabel: "" };

export const W = 640, H = 400;
const pad = { left: 58, right: 20, top: 18, bottom: 48 };

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// A graph from what was stored, dropping anything that isn't a finite point.
export function readGraph(value: unknown): Graph {
  const g = (value && typeof value === "object" ? value : {}) as Partial<Graph>;
  const points = (Array.isArray(g.points) ? g.points : [])
    .map((p) => ({ x: Number(p?.x), y: Number(p?.y), ...(p?.label ? { label: String(p.label).slice(0, 60) } : {}) }))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
    .slice(0, 500);
  return { points, line: !!g.line, xLabel: String(g.xLabel ?? "").slice(0, 80), yLabel: String(g.yLabel ?? "").slice(0, 80) };
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

function range(values: number[]) {
  if (!values.length) return [0, 10];
  let lo = Math.min(...values), hi = Math.max(...values);
  if (lo === hi) { lo -= 1; hi += 1; }
  return [lo, hi];
}

// Where everything goes: the axes' ticks and the functions between data and drawing.
export function layout(g: Graph) {
  const xt = ticks(...(range(g.points.map((p) => p.x)) as [number, number]), 8);
  const yt = ticks(...(range(g.points.map((p) => p.y)) as [number, number]), 6);
  const [x0, x1] = [xt.values[0], xt.values[xt.values.length - 1]];
  const [y0, y1] = [yt.values[0], yt.values[yt.values.length - 1]];
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

const num = (v: number) => (Math.abs(v) >= 1e5 || (v !== 0 && Math.abs(v) < 1e-3) ? v.toExponential(1) : String(Number(v.toPrecision(6))));

export function graphSvg(g: Graph) {
  const { xt, yt, x0, x1, y0, y1, sx, sy } = layout(g);
  const left = pad.left, right = W - pad.right, top = pad.top, bottom = H - pad.bottom;
  const parts: string[] = [];
  for (const v of xt.values) parts.push(`<line class="g-grid" x1="${sx(v)}" y1="${top}" x2="${sx(v)}" y2="${bottom}"/><text class="g-tick" x="${sx(v)}" y="${bottom + 18}" text-anchor="middle">${num(v)}</text>`);
  for (const v of yt.values) parts.push(`<line class="g-grid" x1="${left}" y1="${sy(v)}" x2="${right}" y2="${sy(v)}"/><text class="g-tick" x="${left - 8}" y="${sy(v) + 4}" text-anchor="end">${num(v)}</text>`);
  // The axes through zero, when zero is in view.
  if (x0 <= 0 && x1 >= 0) parts.push(`<line class="g-zero" x1="${sx(0)}" y1="${top}" x2="${sx(0)}" y2="${bottom}"/>`);
  if (y0 <= 0 && y1 >= 0) parts.push(`<line class="g-zero" x1="${left}" y1="${sy(0)}" x2="${right}" y2="${sy(0)}"/>`);
  parts.push(`<rect class="g-frame" x="${left}" y="${top}" width="${right - left}" height="${bottom - top}"/>`);
  if (g.line && g.points.length > 1) {
    const sorted = [...g.points].sort((a, b) => a.x - b.x);
    parts.push(`<path class="g-line" d="${sorted.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join("")}"/>`);
  }
  for (const p of g.points) {
    const cx = sx(p.x).toFixed(1), cy = sy(p.y).toFixed(1);
    parts.push(`<circle class="g-point" cx="${cx}" cy="${cy}" r="4.5"><title>${escape(`(${num(p.x)}, ${num(p.y)})${p.label ? ` ${p.label}` : ""}`)}</title></circle>`);
    // Labels near the right or top edge go on the other side of their point, so they stay inside.
    const flip = Number(cx) > W - pad.right - 90;
    if (p.label) parts.push(`<text class="g-pointlabel" x="${Number(cx) + (flip ? -8 : 8)}" y="${Math.max(top + 12, Number(cy) - 8)}"${flip ? ' text-anchor="end"' : ""}>${escape(p.label)}</text>`);
  }
  if (g.xLabel) parts.push(`<text class="g-label" x="${(left + right) / 2}" y="${H - 6}" text-anchor="middle">${escape(g.xLabel)}</text>`);
  if (g.yLabel) parts.push(`<text class="g-label" transform="translate(14 ${(top + bottom) / 2}) rotate(-90)" text-anchor="middle">${escape(g.yLabel)}</text>`);
  const summary = `Graph of ${g.points.length} point${g.points.length === 1 ? "" : "s"}${g.xLabel || g.yLabel ? `: ${g.yLabel || "y"} against ${g.xLabel || "x"}` : ""}`;
  return `<svg class="graph" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escape(summary)}">${parts.join("")}</svg>`;
}
