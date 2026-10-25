"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export type Option<T extends string> = { value: T; label: string; icon?: ReactNode; hint?: string; className?: string };

type Props<T extends string> = {
  value: T | null;
  options: Option<T>[];
  onChange: (value: T) => void;
  label?: string;
  placeholder?: string;
  compact?: boolean;
  // Keeps the editor's selection while the menu is used.
  keepFocus?: boolean;
};

// A select that matches the site: a button and a list. Arrow keys move, Enter picks, Escape closes, typing a
// letter jumps to the first option that starts with it.
export default function Dropdown<T extends string>({ value, options, onChange, label, placeholder = "Choose", compact, keepFocus }: Props<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function show() {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }

  function pick(i: number) {
    onChange(options[i].value);
    setOpen(false);
    if (!keepFocus) button.current?.focus();
  }

  function onKey(e: React.KeyboardEvent) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); show(); }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % options.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + options.length) % options.length); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(options.length - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(active); }
    else if (e.key === "Tab") setOpen(false);
    else if (e.key.length === 1) {
      const i = options.findIndex((o) => o.label.toLowerCase().startsWith(e.key.toLowerCase()));
      if (i >= 0) setActive(i);
    }
  }

  return (
    <div ref={root} className={`dropdown${compact ? " dropdown-compact" : ""}${open ? " is-open" : ""}`}>
      <button ref={button} type="button" className="dropdown-button" aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-list`}
        aria-label={label} onClick={() => (open ? setOpen(false) : show())} onKeyDown={onKey}
        onMouseDown={(e) => keepFocus && e.preventDefault()}
        aria-activedescendant={open ? `${id}-${active}` : undefined}>
        {current?.icon}
        <span className="dropdown-value">{current?.label ?? placeholder}</span>
        <svg className="dropdown-caret" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" /></svg>
      </button>
      {open && (
        <ul ref={list} id={`${id}-list`} role="listbox" className="dropdown-list" aria-label={label}>
          {options.map((o, i) => (
            <li key={o.value} id={`${id}-${i}`} role="option" aria-selected={o.value === value}
              className={`dropdown-option${i === active ? " is-active" : ""}`}
              onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(i)}>
              {o.icon}
              <span className="dropdown-label"><span className={o.className}>{o.label}</span>{o.hint && <span className="dropdown-hint">{o.hint}</span>}</span>
              {o.value === value && <svg className="dropdown-check" viewBox="0 0 12 10" aria-hidden="true"><path d="M1 5l3.5 3.5L11 1" /></svg>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
