import { arrowHead, escape, fixed, shorten } from "./svg";

// A drawing: shapes inside a fixed boundary, drawn as SVG. The editor and the published note both draw with
// drawingSvg, so a drawing looks the same in each. Colours are names from the site's palette (d-*), so drawings
// follow the light and dark themes.
export const colours = ["ink", "accent", "go", "work", "explore", "danger"] as const;
export type Colour = (typeof colours)[number];

type Base = { id: string; colour: Colour };
export type Box = Base & { kind: "rect" | "ellipse"; x: number; y: number; w: number; h: number; fill: boolean; label: string };
export type Segment = Base & { kind: "line" | "arrow"; x1: number; y1: number; x2: number; y2: number; dashed: boolean };
export type Text = Base & { kind: "text"; x: number; y: number; text: string; size: number };
export type Pen = Base & { kind: "pen"; points: [number, number][] };
export type Shape = Box | Segment | Text | Pen;
export type Drawing = { width: number; height: number; shapes: Shape[] };

export const emptyDrawing: Drawing = { width: 640, height: 360, shapes: [] };
export const limits = { min: 80, max: 2000 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const n = (v: unknown, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
export const newId = () => Math.random().toString(36).slice(2, 9);

// A drawing from what was stored: sizes kept within limits, unknown shapes and colours dropped.
export function readDrawing(value: unknown): Drawing {
  const d = (value && typeof value === "object" ? value : {}) as Partial<Drawing>;
  const width = clamp(Math.round(n(d.width, emptyDrawing.width)), limits.min, limits.max);
  const height = clamp(Math.round(n(d.height, emptyDrawing.height)), limits.min, limits.max);
  const shapes = (Array.isArray(d.shapes) ? d.shapes : []).slice(0, 500).flatMap((raw): Shape[] => {
    const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const base = { id: String(s.id || newId()).slice(0, 12), colour: colours.includes(s.colour as Colour) ? (s.colour as Colour) : "ink" };
    switch (s.kind) {
      case "rect": case "ellipse":
        return [{ ...base, kind: s.kind, x: n(s.x), y: n(s.y), w: Math.max(1, n(s.w, 1)), h: Math.max(1, n(s.h, 1)), fill: !!s.fill, label: String(s.label ?? "").slice(0, 120) }];
      case "line": case "arrow":
        return [{ ...base, kind: s.kind, x1: n(s.x1), y1: n(s.y1), x2: n(s.x2), y2: n(s.y2), dashed: !!s.dashed }];
      case "text":
        // Kept even when empty, so text being retyped doesn't vanish mid-edit; empty text isn't drawn.
        return [{ ...base, kind: "text", x: n(s.x), y: n(s.y), text: String(s.text ?? "").slice(0, 300), size: clamp(n(s.size, 18), 8, 96) }];
      case "pen": {
        const points = (Array.isArray(s.points) ? s.points : []).slice(0, 2000)
          .map((p) => [n(Array.isArray(p) ? p[0] : 0), n(Array.isArray(p) ? p[1] : 0)] as [number, number]);
        return points.length > 1 ? [{ ...base, kind: "pen", points }] : [];
      }
      default:
        return [];
    }
  });
  return { width, height, shapes };
}

// The box a shape takes up, for selecting, moving and keeping it inside the boundary. Text is measured roughly.
export function bounds(s: Shape) {
  switch (s.kind) {
    case "rect": case "ellipse": return { x: s.x, y: s.y, w: s.w, h: s.h };
    case "line": case "arrow": return { x: Math.min(s.x1, s.x2), y: Math.min(s.y1, s.y2), w: Math.abs(s.x2 - s.x1), h: Math.abs(s.y2 - s.y1) };
    case "text": {
      const w = Math.max(1, ...s.text.split("\n").map((l) => l.length)) * s.size * 0.56, h = s.text.split("\n").length * s.size * 1.25;
      return { x: s.x - w / 2, y: s.y - h / 2, w, h };
    }
    case "pen": {
      const xs = s.points.map((p) => p[0]), ys = s.points.map((p) => p[1]);
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    }
  }
}

// The shape moved by (dx, dy), but never past the boundary.
export function move(s: Shape, dx: number, dy: number, d: Pick<Drawing, "width" | "height">): Shape {
  const b = bounds(s);
  dx = clamp(dx, -b.x, d.width - b.x - b.w);
  dy = clamp(dy, -b.y, d.height - b.y - b.h);
  switch (s.kind) {
    case "rect": case "ellipse": case "text": return { ...s, x: s.x + dx, y: s.y + dy };
    case "line": case "arrow": return { ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy };
    case "pen": return { ...s, points: s.points.map(([x, y]) => [x + dx, y + dy] as [number, number]) };
  }
}

// A point kept inside the boundary.
export const inside = (x: number, y: number, d: Pick<Drawing, "width" | "height">) => ({ x: clamp(x, 0, d.width), y: clamp(y, 0, d.height) });

function lines(text: string, x: number, y: number, size: number, cls: string) {
  const rows = text.split("\n");
  const top = y - ((rows.length - 1) * size * 1.25) / 2;
  return `<text class="${cls}" x="${fixed(x)}" y="${fixed(top)}" font-size="${size}" text-anchor="middle" dominant-baseline="central">`
    + rows.map((r, i) => `<tspan x="${fixed(x)}" dy="${i ? fixed(size * 1.25) : 0}">${escape(r) || " "}</tspan>`).join("") + "</text>";
}

export function shapeSvg(s: Shape, attrs = "") {
  const c = `d-shape d-${s.colour}`;
  switch (s.kind) {
    case "rect": case "ellipse": {
      const body = s.kind === "rect"
        ? `<rect x="${fixed(s.x)}" y="${fixed(s.y)}" width="${fixed(s.w)}" height="${fixed(s.h)}" rx="6"/>`
        : `<ellipse cx="${fixed(s.x + s.w / 2)}" cy="${fixed(s.y + s.h / 2)}" rx="${fixed(s.w / 2)}" ry="${fixed(s.h / 2)}"/>`;
      return `<g class="${c}${s.fill ? " is-filled" : ""}"${attrs}>${body}${s.label ? lines(s.label, s.x + s.w / 2, s.y + s.h / 2, 15, "d-label") : ""}</g>`;
    }
    case "line": case "arrow": {
      const tip = s.kind === "arrow" ? shorten(s.x1, s.y1, s.x2, s.y2, 9) : { x: s.x2, y: s.y2 };
      return `<g class="${c}${s.dashed ? " is-dashed" : ""}"${attrs}><line x1="${fixed(s.x1)}" y1="${fixed(s.y1)}" x2="${fixed(tip.x)}" y2="${fixed(tip.y)}"/>`
        + (s.kind === "arrow" ? `<polygon class="d-head" points="${arrowHead(s.x1, s.y1, s.x2, s.y2, 12)}"/>` : "") + "</g>";
    }
    case "text":
      return s.text.trim() ? `<g class="${c}"${attrs}>${lines(s.text, s.x, s.y, s.size, "d-text")}</g>` : "";
    case "pen":
      return `<g class="${c}"${attrs}><path class="d-pen" d="${s.points.map(([x, y], i) => `${i ? "L" : "M"}${fixed(x)} ${fixed(y)}`).join("")}"/></g>`;
  }
}

export function drawingSvg(d: Drawing) {
  const texts = d.shapes.flatMap((s) => (s.kind === "text" ? [s.text] : "label" in s && s.label ? [s.label] : []));
  const summary = `Drawing of ${d.shapes.length} shape${d.shapes.length === 1 ? "" : "s"}${texts.length ? `: ${texts.join(", ").slice(0, 200)}` : ""}`;
  return `<svg class="drawing" viewBox="0 0 ${d.width} ${d.height}" role="img" aria-label="${escape(summary)}">${d.shapes.map((s) => shapeSvg(s)).join("")}</svg>`;
}
