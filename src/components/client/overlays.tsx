"use client";

import { useEffect, useState, type MouseEvent } from "react";
import type { ScriptBlock } from "@/lib/types";

function useEsc(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Cerrar" className="flex size-11 cursor-pointer items-center justify-center rounded-full border-none bg-surface-4 text-xl text-white">
      ×
    </button>
  );
}

/** Full-screen black image viewer. Tap zooms 2.2× around the tapped point. */
export function ImageViewer({ src, caption, open, onClose }: { src: string | null; caption?: string | null; open: boolean; onClose: () => void }) {
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const close = () => {
    setZoom(false);
    onClose();
  };
  useEsc(open, close);

  const toggle = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin(`${Math.round(((e.clientX - r.left) / r.width) * 100)}% ${Math.round(((e.clientY - r.top) / r.height) * 100)}%`);
    setZoom((z) => !z);
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className="fixed inset-0 z-[60] flex flex-col bg-black transition-opacity duration-[250ms]"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
      >
        <div className="flex h-24 flex-none items-end justify-between px-4 pb-2.5">
          <span className="text-[13px] text-text-2c">{zoom ? "Toca para alejar" : "Toca la imagen para acercar"}</span>
          <CloseButton onClick={close} />
        </div>
        <div onClick={toggle} className="flex flex-1 items-center justify-center overflow-hidden" style={{ cursor: zoom ? "zoom-out" : "zoom-in" }}>
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt="Referencia ampliada"
              className="block max-h-full max-w-full"
              style={{ transition: "transform .3s cubic-bezier(.2,.8,.2,1)", transform: zoom ? "scale(2.2)" : "scale(1)", transformOrigin: origin }}
            />
          )}
        </div>
        {caption && <div className="flex-none px-5 pt-3.5 pb-[34px] text-sm leading-[1.45] text-text-2">{caption}</div>}
      </div>
    </>
  );
}

/** v1 reading mode: big text, manual scroll. No autoscroll (that's v2). */
export function ReadingMode({ blocks, open, onClose }: { blocks: ScriptBlock[]; open: boolean; onClose: () => void }) {
  useEsc(open, onClose);
  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Modo lectura"
        aria-hidden={!open}
        className="fixed inset-0 z-[61] flex flex-col bg-black"
        style={{ transition: "opacity .25s, transform .3s", opacity: open ? 1 : 0, transform: open ? "translateY(0)" : "translateY(30px)", pointerEvents: open ? "auto" : "none" }}
      >
        <div className="flex h-24 flex-none items-end justify-between px-4 pb-2.5">
          <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-amber">Modo lectura</span>
          <CloseButton onClick={onClose} />
        </div>
        <div className="no-scrollbar mx-auto w-full max-w-[720px] flex-1 overflow-y-auto px-6 pt-[10vh] pb-[40vh]">
          {blocks.map((b, i) => (
            <div key={b.id} className="mb-14 flex flex-col gap-[18px]">
              <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-amber">
                {String(i + 1).padStart(2, "0")} · {b.label}
              </span>
              {b.lines.map((l, j) => (
                <p key={j} className="m-0 text-[31px] leading-[1.3] font-semibold text-white" style={{ textWrap: "pretty" }}>{l}</p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
