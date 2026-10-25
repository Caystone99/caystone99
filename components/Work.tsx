"use client";

import { useState } from "react";
import { work, type Org } from "@/lib/content";

const host = (href: string) => new URL(href).hostname.replace(/^www\./, "");

// Roles, and what I built in each. Pointing at a role lights up its projects; each project says who it was for.
export default function Work() {
  const [active, setActive] = useState<Org | null>(null);
  const name = (k: Org) => work.roles.find((r) => r.key === k)?.name ?? "";

  return (
    <div className={`work${active ? " has-active" : ""}`}>
      <h3 className="label built-label">By day</h3>
      <ol className="built roles">
        {work.roles.map((r) => (
          <li key={r.key} className={active === r.key ? "is-active" : active ? "is-dim" : undefined}
            onMouseEnter={() => setActive(r.key)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(r.key)} onBlur={() => setActive(null)}>
            <a href={r.href} target="_blank" rel="noopener" className="built-row">
              <span className="built-no role-title">{r.role}</span>
              <span className="built-name">{r.name}</span>
              <span className="built-what">{r.what}</span>
              <span className="built-host">{work.built.filter((b) => b.for === r.key).length} built<span className="built-arrow" aria-hidden="true">→</span></span>
            </a>
          </li>
        ))}
      </ol>

      <h3 className="label built-label built-gap">Built</h3>
      <ol className="built">
        {work.built.map((w, i) => (
          <li key={w.name + w.for} className={active && active !== w.for ? "is-dim" : undefined}>
            <a href={w.href} target="_blank" rel="noopener" className="built-row">
              <span className="built-no">{String(i + 1).padStart(2, "0")}</span>
              <span className="built-name">{w.name}<span className="built-for">for {name(w.for)}</span></span>
              <span className="built-what">{w.what}</span>
              <span className="built-host">{host(w.href)}<span className="built-arrow" aria-hidden="true">→</span></span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}
