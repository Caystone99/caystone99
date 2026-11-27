// Small pieces shared by the SVG that graphs and drawings are made of.

// The colours lines and shapes can be: names from the site's palette (styled as d-*), so they follow the theme.
export const colours = ["ink", "accent", "go", "work", "explore", "danger"] as const;
export type Colour = (typeof colours)[number];
export const isColour = (v: unknown): v is Colour => colours.includes(v as Colour);
export const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const fixed = (v: number) => String(Number(v.toFixed(1)));

// An arrowhead at (x2, y2), pointing along the line from (x1, y1), as polygon points. Drawn as a shape rather than
// an SVG marker, since markers need ids and a page can hold many drawings.
export function arrowHead(x1: number, y1: number, x2: number, y2: number, size = 10) {
  const a = Math.atan2(y2 - y1, x2 - x1), spread = 0.42;
  const p = (t: number) => `${fixed(x2 - size * Math.cos(t))},${fixed(y2 - size * Math.sin(t))}`;
  return `${fixed(x2)},${fixed(y2)} ${p(a - spread)} ${p(a + spread)}`;
}

// The line from (x1, y1) stopped short of (x2, y2) by `by`, so it ends inside the arrowhead rather than past its tip.
export function shorten(x1: number, y1: number, x2: number, y2: number, by: number) {
  const d = Math.hypot(x2 - x1, y2 - y1);
  if (d <= by) return { x: x1, y: y1 };
  return { x: x2 - ((x2 - x1) / d) * by, y: y2 - ((y2 - y1) / d) * by };
}
