"use client";

import { ChevronLeft, ChevronRight, ExternalLink, FileWarning, FileText, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export type GalleryItem = {
  url: string | null;
  label: string;
  sub?: string;
  kind: "image" | "pdf" | "file";
};

/**
 * Full-screen single-item viewer for a tenant's photos and documents.
 * Swipe or use the arrow buttons / arrow keys to move between items.
 */
export function Lightbox({
  items,
  index,
  onClose,
  onIndexChange,
}: {
  items: GalleryItem[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const touchStart = useRef<number | null>(null);
  const item = items[index];
  const go = (delta: number) => {
    const next = index + delta;
    if (next >= 0 && next < items.length) onIndexChange(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items.length]);

  const root = document.getElementById("sheet-root");
  if (!root || !item) return null;

  return createPortal(
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={item.label}
      onTouchStart={(e) => {
        touchStart.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStart.current == null) return;
        const dx = e.changedTouches[0].clientX - touchStart.current;
        touchStart.current = null;
        if (Math.abs(dx) > 48) go(dx > 0 ? -1 : 1);
      }}
    >
      <div className="lightbox-head">
        <button className="icon-btn plain light" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <div className="lightbox-title">
          <strong>{item.label}</strong>
          {items.length > 1 && (
            <span>
              {index + 1} of {items.length}
            </span>
          )}
        </div>
        {item.url ? (
          <a
            className="icon-btn plain light"
            href={item.url}
            target="_blank"
            rel="noreferrer"
            aria-label="Open original"
          >
            <ExternalLink size={16} />
          </a>
        ) : (
          <span style={{ width: 32 }} />
        )}
      </div>

      <div className="lightbox-stage">
        {index > 0 && (
          <button className="lightbox-nav prev" onClick={() => go(-1)} aria-label="Previous">
            <ChevronLeft size={22} />
          </button>
        )}

        {!item.url ? (
          <div className="lightbox-empty">
            <FileWarning size={36} strokeWidth={1.5} />
            <span>This file is no longer available.</span>
          </div>
        ) : item.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt={item.label} className="lightbox-img" />
        ) : item.kind === "pdf" ? (
          <iframe src={item.url} className="lightbox-pdf" title={item.label} />
        ) : (
          <div className="lightbox-empty">
            <FileText size={36} strokeWidth={1.5} />
            <a href={item.url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
              Open file
            </a>
          </div>
        )}

        {index < items.length - 1 && (
          <button className="lightbox-nav next" onClick={() => go(1)} aria-label="Next">
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {item.sub && <div className="lightbox-foot">{item.sub}</div>}
    </div>,
    root,
  );
}
