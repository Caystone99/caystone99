"use client";

import type { Editor } from "@tiptap/core";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { useEffect, useRef, useState, type RefObject } from "react";
import { blocks, type EditorActions } from "./extensions";
import { Icon } from "./icons";

type Spot = { top: number; pos: number };

// Beside whichever block the pointer is over: + adds a block below it (through the "/" menu), and the grip
// drags it somewhere else or, clicked, opens a menu to move, copy, convert or delete it.
export default function BlockHandle({ editor, area, actions }: { editor: Editor; area: RefObject<HTMLDivElement | null>; actions: EditorActions }) {
  const [spot, setSpot] = useState<Spot | null>(null);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const open = useRef(false);
  open.current = menu;

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const move = (e: MouseEvent) => {
      if (open.current || editor.isDestroyed) return;
      const view = editor.view;
      const box = view.dom.getBoundingClientRect();
      if (e.clientY < box.top || e.clientY > box.bottom) return;
      const hit = view.posAtCoords({ left: box.left + 40, top: e.clientY });
      if (!hit || hit.inside < 0) return;
      // Climb to the top-level block (a whole list, not one item in it).
      const $at = view.state.doc.resolve(hit.inside);
      const pos = $at.depth > 0 ? $at.before(1) : hit.inside;
      const dom = view.nodeDOM(pos);
      if (!(dom instanceof HTMLElement)) return;
      const r = dom.getBoundingClientRect(), a = el.getBoundingClientRect();
      const line = parseFloat(getComputedStyle(dom).lineHeight) || 28;
      setSpot({ pos, top: r.top - a.top + Math.max(0, (Math.min(line, r.height) - 26) / 2) });
    };
    const leave = () => { if (!open.current) setSpot(null); };
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    return () => { el.removeEventListener("mousemove", move); el.removeEventListener("mouseleave", leave); };
  }, [editor, area]);

  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [menu]);

  // Content can shift under the handle after any edit, so it re-finds its block next time the pointer moves.
  useEffect(() => {
    const hide = () => { if (!open.current) setSpot(null); };
    editor.on("update", hide);
    return () => { editor.off("update", hide); };
  }, [editor]);

  if (!spot) return null;
  const node = editor.state.doc.nodeAt(spot.pos);
  if (!node) return null;
  const end = spot.pos + node.nodeSize;
  const index = editor.state.doc.resolve(spot.pos).index(0);
  const last = index === editor.state.doc.childCount - 1;

  function add() {
    // An empty paragraph just gets the "/"; anything else gets a new paragraph below it.
    if (node!.type.name === "paragraph" && node!.content.size === 0) editor.chain().focus(spot!.pos + 1).insertContent("/").run();
    else editor.chain().insertContentAt(end, { type: "paragraph", content: [{ type: "text", text: "/" }] }).focus(end + 2).run();
    setSpot(null);
  }

  function shift(by: -1 | 1) {
    const { state } = editor;
    const sibling = state.doc.child(index + by);
    const tr = state.tr.delete(spot!.pos, end);
    const to = by < 0 ? spot!.pos - sibling.nodeSize : spot!.pos + sibling.nodeSize;
    tr.insert(to, node!);
    tr.setSelection(NodeSelection.create(tr.doc, to));
    editor.view.dispatch(tr.scrollIntoView());
    editor.view.focus();
    setMenu(false); setSpot(null);
  }

  function run(change: (tr: typeof editor.state.tr) => void) {
    const tr = editor.state.tr;
    change(tr);
    editor.view.dispatch(tr);
    editor.view.focus();
    setMenu(false); setSpot(null);
  }

  function convert(key: string) {
    const block = blocks.find((b) => b.key === key)!;
    // Put the cursor in the block first, so the change applies to it.
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.near(editor.state.doc.resolve(spot!.pos + 1))));
    block.run(editor, actions);
    setMenu(false); setSpot(null);
  }

  function onDragStart(e: React.DragEvent) {
    const view = editor.view;
    const selection = NodeSelection.create(view.state.doc, spot!.pos);
    view.dispatch(view.state.tr.setSelection(selection));
    const dom = view.nodeDOM(spot!.pos);
    if (dom instanceof HTMLElement) e.dataTransfer.setDragImage(dom, 0, 0);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", node!.textContent);
    // ProseMirror moves whatever is in view.dragging when it's dropped.
    view.dragging = { slice: selection.content(), move: true };
  }

  const text = node.isTextblock || ["bulletList", "orderedList", "taskList", "blockquote", "callout"].includes(node.type.name);

  return (
    <div className="block-handle" style={{ top: spot.top }} onMouseDown={(e) => e.target === e.currentTarget && e.preventDefault()}>
      <button type="button" className="block-handle-btn" aria-label="Add a block below" title="Add a block below" onClick={add}><Icon name="plus" /></button>
      <button type="button" className="block-handle-btn grip" aria-label="Move or change this block" title="Drag to move, click for options"
        draggable onDragStart={onDragStart} onDragEnd={() => setSpot(null)} onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
        <Icon name="grip" />
      </button>
      {menu && (
        <div ref={menuRef} className="block-menu" role="menu">
          {text && (
            <>
              <p className="block-menu-head">Turn into</p>
              {blocks.filter((b) => b.convert).map((b) => (
                <button key={b.key} type="button" role="menuitem" className="block-menu-item" onClick={() => convert(b.key)}>
                  <Icon name={b.icon} />{b.label}
                </button>
              ))}
              <hr />
            </>
          )}
          <button type="button" role="menuitem" className="block-menu-item" disabled={index === 0} onClick={() => shift(-1)}><Icon name="up" />Move up</button>
          <button type="button" role="menuitem" className="block-menu-item" disabled={last} onClick={() => shift(1)}><Icon name="down" />Move down</button>
          <button type="button" role="menuitem" className="block-menu-item" onClick={() => run((tr) => tr.insert(end, node))}><Icon name="copy" />Duplicate</button>
          <button type="button" role="menuitem" className="block-menu-item danger" onClick={() => run((tr) => tr.delete(spot.pos, end))}><Icon name="trash" />Delete</button>
        </div>
      )}
    </div>
  );
}
