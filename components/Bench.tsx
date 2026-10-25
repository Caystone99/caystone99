"use client";

import { useState } from "react";
import { bench, fields, type Field } from "@/lib/content";
import Sketch from "./Sketch";

// What's on the bench, as cards, with the fields as filters.
export default function Bench({ notes = {} }: { notes?: Record<string, number> }) {
  const [only, setOnly] = useState<Field | null>(null);
  const shown = only ? bench.filter((e) => e.field === only) : bench;
  const count = (f: Field) => bench.filter((e) => e.field === f).length;
  // Companies take two columns. The last card stretches to fill whatever the three-column grid leaves empty.
  const cells = shown.length + shown.filter((e) => e.field === "company").length;
  const span = (i: number) => {
    if (shown[i].field === "company") return " card-wide";
    if (i !== shown.length - 1) return "";
    return cells % 3 === 2 ? " card-wide" : cells % 3 === 1 && shown.length > 1 ? " card-full" : "";
  };

  return (
    <>
      <nav className="filters" aria-label="Fields">
        <button type="button" aria-pressed={only === null} onClick={() => setOnly(null)}>All <span>{bench.length}</span></button>
        {fields.map((f) => (
          <button key={f.key} type="button" aria-pressed={only === f.key} title={f.note} onClick={() => setOnly(only === f.key ? null : f.key)}>
            {f.label} <span>{count(f.key)}</span>
          </button>
        ))}
      </nav>

      <ol className="cards">
        {shown.map((e, i) => (
          <li key={e.no} className={`card${span(i)}`}>
            <div className="card-art"><Sketch kind={e.sketch} /></div>
            <div className="card-body">
              <div className="card-meta">
                <span>{e.no}</span>
                <span>{fields.find((f) => f.key === e.field)?.label}</span>
                <span className={`status status-${{ Building: "go", Reading: "read", Exploring: "explore", "In progress": "work" }[e.status]}`}>{e.status}</span>
              </div>
              <h3 className="card-title">{e.title}</h3>
              <p className="card-text">{e.body}</p>
              <p className="card-note">{e.margin}</p>
              <div className="card-links">
                {e.link && <a className="card-link" href={e.link.href}>{e.link.label}<span aria-hidden="true">↗</span></a>}
                {!!notes[e.key] && <a className="card-link" href={`/notes?topic=${e.key}`}>{notes[e.key]} note{notes[e.key] === 1 ? "" : "s"}<span aria-hidden="true">→</span></a>}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
