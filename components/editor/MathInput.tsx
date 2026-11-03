"use client";

import katex from "katex";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

// LaTeX for an equation, typed or picked. Each symbol is a snippet; "|" marks where the cursor lands, so
// picking a fraction leaves you typing its top.
const palette: { name: string; items: [label: string, snippet: string][] }[] = [
  { name: "Common", items: [
    ["x^{n}", "^{|}"], ["x_{i}", "_{|}"], ["\\frac{a}{b}", "\\frac{|}{}"], ["\\sqrt{x}", "\\sqrt{|}"], ["\\sqrt[n]{x}", "\\sqrt[|]{}"],
    ["\\pm", "\\pm "], ["\\times", "\\times "], ["\\cdot", "\\cdot "], ["\\div", "\\div "], ["\\neq", "\\neq "], ["\\approx", "\\approx "],
    ["\\leq", "\\leq "], ["\\geq", "\\geq "], ["\\infty", "\\infty "], ["\\pi", "\\pi "], ["\\theta", "\\theta "], ["\\Delta", "\\Delta "],
    ["\\degree", "^\\circ "], ["(\\,)", "\\left( | \\right)"], ["|x|", "\\left| | \\right|"],
  ] },
  { name: "Greek", items: [
    ...["alpha", "beta", "gamma", "delta", "epsilon", "varepsilon", "zeta", "eta", "theta", "vartheta", "iota", "kappa", "lambda", "mu", "nu", "xi",
      "pi", "rho", "sigma", "tau", "upsilon", "phi", "varphi", "chi", "psi", "omega",
      "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Phi", "Psi", "Omega"].map((g): [string, string] => [`\\${g}`, `\\${g} `]),
  ] },
  { name: "Calculus", items: [
    ["\\sum_{i=1}^{n}", "\\sum_{|}^{}"], ["\\prod_{i=1}^{n}", "\\prod_{|}^{}"], ["\\int_{a}^{b}", "\\int_{|}^{} \\, dx"], ["\\iint", "\\iint "],
    ["\\oint", "\\oint "], ["\\lim_{x \\to 0}", "\\lim_{| \\to }"], ["\\frac{d}{dx}", "\\frac{d|}{dx}"], ["\\frac{\\partial}{\\partial x}", "\\frac{\\partial |}{\\partial }"],
    ["\\partial", "\\partial "], ["\\nabla", "\\nabla "], ["\\dot{x}", "\\dot{|}"], ["\\ddot{x}", "\\ddot{|}"], ["f'", "'"], ["e^{x}", "e^{|}"],
    ["\\ln", "\\ln "], ["\\log", "\\log "], ["\\sin", "\\sin "], ["\\cos", "\\cos "], ["\\tan", "\\tan "], ["\\arctan", "\\arctan "],
  ] },
  { name: "Relations", items: [
    ...["=", "<", ">"].map((s): [string, string] => [s, `${s} `]),
    ...["neq", "approx", "equiv", "sim", "simeq", "propto", "leq", "geq", "ll", "gg", "in", "notin", "subset", "subseteq", "cup", "cap", "emptyset",
      "forall", "exists", "neg", "land", "lor", "perp", "parallel", "angle"].map((s): [string, string] => [`\\${s}`, `\\${s} `]),
  ] },
  { name: "Arrows", items: [
    ...["to", "gets", "leftrightarrow", "Rightarrow", "Leftarrow", "Leftrightarrow", "mapsto", "uparrow", "downarrow", "rightleftharpoons", "longrightarrow"]
      .map((s): [string, string] => [`\\${s}`, `\\${s} `]),
  ] },
  { name: "Vectors", items: [
    ["\\vec{v}", "\\vec{|}"], ["\\hat{x}", "\\hat{|}"], ["\\bar{x}", "\\bar{|}"], ["\\overline{AB}", "\\overline{|}"], ["\\mathbf{v}", "\\mathbf{|}"],
    ["\\|v\\|", "\\left\\| | \\right\\|"], ["\\langle a, b \\rangle", "\\langle | \\rangle"], ["\\cdot", "\\cdot "], ["\\times", "\\times "], ["A^{T}", "^{T}"],
    ["\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}", "\\begin{pmatrix} | & \\\\  & \\end{pmatrix}"],
    ["\\begin{bmatrix} a \\\\ b \\end{bmatrix}", "\\begin{bmatrix} | \\\\  \\end{bmatrix}"],
    ["\\det", "\\det "], ["\\mathbb{R}", "\\mathbb{R}"], ["\\mathbb{R}^{n}", "\\mathbb{R}^{|}"],
  ] },
  { name: "Layout", items: [
    ["\\begin{cases} a \\\\ b \\end{cases}", "\\begin{cases} | & \\text{if }  \\\\  & \\text{otherwise} \\end{cases}"],
    ["\\begin{aligned} a &= b \\\\ &= c \\end{aligned}", "\\begin{aligned} | &=  \\\\ &=  \\end{aligned}"],
    ["\\text{abc}", "\\text{|}"], ["a \\, b", "\\, "], ["a \\quad b", "\\quad "], ["\\underbrace{x}_{n}", "\\underbrace{|}_{}"],
    ["\\boxed{x}", "\\boxed{|}"], ["\\color{#2c5bd0}{x}", "\\color{|}{}"],
  ] },
];

// KaTeX's output for a piece of LaTeX, or why it couldn't be read.
export function renderMath(latex: string, display: boolean): { html: string; error?: string } {
  try {
    return { html: katex.renderToString(latex, { displayMode: display, throwOnError: true, strict: false }) };
  } catch (e) {
    return { html: "", error: e instanceof Error ? e.message.replace(/^KaTeX parse error: /, "") : String(e) };
  }
}

export default function MathInput({ latex, display, onChange, onDone }: { latex: string; display: boolean; onChange: (latex: string) => void; onDone: () => void }) {
  const [tab, setTab] = useState(0);
  const field = useRef<HTMLTextAreaElement>(null);
  // Where the cursor goes once a picked symbol is in.
  const caret = useRef<number | null>(null);
  const buttons = useMemo(() => palette.map((g) => g.items.map(([label]) => renderMath(label, false).html)), []);
  const error = latex.trim() ? renderMath(latex, display).error : undefined;

  useLayoutEffect(() => {
    if (caret.current === null || !field.current) return;
    field.current.focus();
    field.current.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  }, [latex]);

  function insert(snippet: string) {
    const el = field.current;
    const at = el ? [el.selectionStart, el.selectionEnd] : [latex.length, latex.length];
    caret.current = at[0] + (snippet.includes("|") ? snippet.indexOf("|") : snippet.length);
    onChange(latex.slice(0, at[0]) + snippet.replace("|", "") + latex.slice(at[1]));
  }

  return (
    <div className="math-input" onMouseDown={(e) => e.stopPropagation()}>
      <textarea ref={field} className="math-field" value={latex} autoFocus spellCheck={false} rows={display ? 3 : 1}
        placeholder={display ? "LaTeX, e.g. F = m\\ddot{x}" : "LaTeX, e.g. x^2"} aria-label="Equation in LaTeX"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // Enter finishes an inline equation; a block takes new lines, and finishes with Cmd/Ctrl+Enter.
          if (e.key === "Escape" || (e.key === "Enter" && (!display || e.metaKey || e.ctrlKey))) { e.preventDefault(); onDone(); }
        }} />
      {error && <p className="math-error" role="status">{error}</p>}
      <div className="math-tabs" role="tablist" aria-label="Symbols">
        {palette.map((g, i) => (
          <button key={g.name} type="button" role="tab" aria-selected={i === tab} className={`math-tab${i === tab ? " is-on" : ""}`} onClick={() => setTab(i)}>{g.name}</button>
        ))}
        <button type="button" className="btn btn-sm math-done" onClick={onDone}>Done</button>
      </div>
      <div className="math-palette">
        {palette[tab].items.map(([label, snippet], i) => (
          <button key={label} type="button" className="math-symbol" title={snippet.replace("|", "")}
            onMouseDown={(e) => e.preventDefault()} onClick={() => insert(snippet)}
            dangerouslySetInnerHTML={{ __html: buttons[tab][i] }} />
        ))}
      </div>
    </div>
  );
}
