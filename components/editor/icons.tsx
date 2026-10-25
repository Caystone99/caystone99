// Line icons for the editor, drawn on a 16px grid in the same weight as the rest of the site.
const paths = {
  text: "M3 3.5h10M8 3.5v9M6 12.5h4",
  h2: "M2.5 3.5v9M8 3.5v9M2.5 8H8M10.5 7a2 2 0 1 1 3.2 1.6l-3.2 3.9h3.6",
  h3: "M2.5 3.5v9M8 3.5v9M2.5 8H8M10.5 5.6a1.8 1.8 0 1 1 1.8 2h-.5M12.3 7.6a1.9 1.9 0 1 1-1.9 2.6",
  bullet: "M6 4h8M6 8h8M6 12h8M2.6 4h.1M2.6 8h.1M2.6 12h.1",
  ordered: "M6.5 4h7.5M6.5 8h7.5M6.5 12h7.5M2 3l1-.5v3M2 10.2a.9.9 0 1 1 1.4.8L2 12.5h1.8",
  task: "M2.5 3.5h3v3h-3zM3.2 11l.9.9 1.6-1.9M8 5h6M8 11h6",
  quote: "M3 4v8M6.5 5.5h7M6.5 8h7M6.5 10.5h5",
  callout: "M2.5 3h11v8h-6l-3 2.5V11h-2zM8 5.5v2M8 9.2v.1",
  code: "M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5M9.2 3 6.8 13",
  divider: "M2 8h12M5 4.5h6M5 11.5h6",
  media: "M2.5 3.5h11v9h-11zM2.5 10.5l3.2-3 2.6 2.4 2-1.8 3.2 2.9M10.2 6.2h.1",
  video: "M2.5 4h11v8h-11zM7 6.2v3.6L10 8z",
  bold: "M4.5 3h4a2.5 2.5 0 0 1 0 5h-4zM4.5 8h4.8a2.5 2.5 0 0 1 0 5H4.5z",
  italic: "M10 3H6.5M9.5 13H6M8.8 3 7.2 13",
  underline: "M4.5 2.5V7a3.5 3.5 0 0 0 7 0V2.5M3.5 14h9",
  strike: "M3 8h10M11 4.6C10.6 3.6 9.4 3 8 3 6.1 3 5 4 5 5.3c0 1 .7 1.7 2 2.2M5 11.3c.4 1 1.6 1.7 3 1.7 2 0 3-1 3-2.3 0-.5-.2-1-.5-1.3",
  inlineCode: "M5.5 5 2.5 8l3 3M10.5 5l3 3-3 3",
  highlight: "M9.5 2.5l4 4-6 6H3.5v-4zM2 14h12",
  link: "M6.8 9.2a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-.8.8M9.2 6.8a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l.8-.8",
  unlink: "M6.8 9.2a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2M9.2 6.8a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2M2 2l12 12",
  undo: "M5 3.5 2.5 6 5 8.5M2.5 6h7a3.5 3.5 0 0 1 0 7H6",
  redo: "M11 3.5 13.5 6 11 8.5M13.5 6h-7a3.5 3.5 0 0 0 0 7H10",
  plus: "M8 3v10M3 8h10",
  grip: "M6 3.5h.1M10 3.5h.1M6 8h.1M10 8h.1M6 12.5h.1M10 12.5h.1",
  up: "M8 13V3M4 7l4-4 4 4",
  down: "M8 3v10M4 9l4 4 4-4",
  copy: "M5.5 5.5h8v8h-8zM10.5 5.5v-3h-8v8h3",
  trash: "M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5",
  check: "M3 8.5l3 3 7-7",
  close: "M4 4l8 8M12 4l-8 8",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`icon${className ? ` ${className}` : ""}`} aria-hidden="true" fill="none" stroke="currentColor"
      strokeWidth={name === "grip" ? 2.4 : 1.3} strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
}
