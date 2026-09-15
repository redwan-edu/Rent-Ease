"use client";

import { Check, ChevronLeft, Hand, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { errorMessage, initials } from "@/lib/format";

export function Logo({ size = 44 }: { size?: number }) {
  return (
    <span className="logo" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="" width={size} height={size} draggable={false} />
    </span>
  );
}

/** Full-screen loader: the logo breathing above a thin progress line. With a message it becomes a notice. */
export function Splash({ message, action }: { message?: string; action?: ReactNode }) {
  return (
    <div className="splash" role={message ? "alert" : "status"} aria-live="polite">
      <span className={`splash-mark${message ? "" : " loading"}`}>
        <Logo size={44} />
      </span>
      {message ? (
        <p className="splash-msg">{message}</p>
      ) : (
        <>
          <span className="loader-bar" aria-hidden />
          <span className="sr-only">Loading</span>
        </>
      )}
      {action}
    </div>
  );
}

export function Spinner({ size = 18 }: { size?: number }) {
  return <span className="spinner" style={{ width: size, height: size }} />;
}

export function Avatar({
  name,
  url,
  size = 40,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt="" /> : initials(name)}
    </span>
  );
}

/** A titled block of a page: heading, optional count and action, then its content. */
export function Section({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="section-head">
        <h2>
          {title}
          {count !== undefined && <span className="count">{count}</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Sheet({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const root = document.getElementById("sheet-root");
  if (!root) return null;
  return createPortal(
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grab" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn plain" onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </>,
    root,
  );
}

/** A full-screen sub page that slides over the current screen without leaving it. */
export function OverlayPage({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onBack();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  const root = document.getElementById("sheet-root");
  if (!root) return null;
  return createPortal(
    <div className="overlay-page" role="dialog" aria-modal="true" aria-label={title}>
      <div className="scroll no-nav">
        <header className="header sub">
          <button className="icon-btn" onClick={onBack} aria-label="Back">
            <ChevronLeft size={22} />
          </button>
          <h1 className="header-title">{title}</h1>
        </header>
        {children}
      </div>
    </div>,
    root,
  );
}

/**
 * Press-and-hold confirm: the button fills left to right and only fires once
 * held for the full duration, so a stray tap never records anything.
 */
export function HoldButton({
  label,
  doneLabel,
  duration = 1000,
  disabled,
  onComplete,
  tone = "confirm",
}: {
  label: string;
  doneLabel: string;
  duration?: number;
  disabled?: boolean;
  onComplete: () => Promise<boolean>;
  /** "danger" for an undo/delete hold — red fill instead of the usual green. */
  tone?: "confirm" | "danger";
}) {
  const [phase, setPhase] = useState<"idle" | "holding" | "busy" | "done">("idle");
  const phaseRef = useRef(phase);
  const progress = useRef(0);
  const startedAt = useRef(0);
  const frame = useRef(0);
  const fill = useRef<HTMLSpanElement>(null);

  const set = (p: typeof phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const paint = (p: number, animate: boolean) => {
    const el = fill.current;
    if (!el) return;
    el.style.transition = animate ? "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)" : "none";
    el.style.transform = `scaleX(${p})`;
  };

  const finish = async () => {
    set("busy");
    navigator.vibrate?.(40);
    const ok = await onComplete();
    if (ok) {
      set("done");
    } else {
      progress.current = 0;
      paint(0, true);
      set("idle");
    }
  };

  const tick = (now: number) => {
    const p = Math.min(1, (now - startedAt.current) / duration);
    progress.current = p;
    paint(p, false);
    if (p >= 1) void finish();
    else frame.current = requestAnimationFrame(tick);
  };

  const begin = () => {
    if (disabled || phaseRef.current !== "idle") return;
    set("holding");
    startedAt.current = performance.now() - progress.current * duration;
    frame.current = requestAnimationFrame(tick);
  };

  const release = () => {
    if (phaseRef.current !== "holding") return;
    cancelAnimationFrame(frame.current);
    progress.current = 0;
    paint(0, true);
    set("idle");
  };

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const isKey = (e: React.KeyboardEvent) => e.key === " " || e.key === "Enter";

  return (
    <div className="hold">
      <button
        type="button"
        className={`btn ${tone === "danger" ? "btn-destructive" : "btn-primary"} hold-btn${tone === "danger" ? " tone-danger" : ""} ${phase}`}
        disabled={disabled || phase === "busy"}
        aria-label={`${label}. Press and hold to confirm.`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          begin();
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (isKey(e)) {
            e.preventDefault();
            if (!e.repeat) begin();
          }
        }}
        onKeyUp={(e) => isKey(e) && release()}
      >
        <span ref={fill} className={`hold-fill${tone === "danger" ? " danger" : ""}`} />
        <span className="hold-label">
          {phase === "done" ? (
            <>
              <Check size={18} /> {doneLabel}
            </>
          ) : phase === "busy" ? (
            <Spinner />
          ) : phase === "holding" ? (
            "Keep holding…"
          ) : (
            <>
              <Hand size={17} /> {label}
            </>
          )}
        </span>
      </button>
      <div className="hold-hint">
        Press and hold for {duration / 1000} second{duration === 1000 ? "" : "s"} to confirm
      </div>
    </div>
  );
}

export function ConfirmSheet({
  title,
  text,
  confirmLabel,
  onConfirm,
  onClose,
  tone = "danger",
}: {
  title: string;
  text: string;
  confirmLabel: string;
  onConfirm: () => Promise<unknown>;
  onClose: () => void;
  /** "neutral" for confirmations that undo nothing, like restoring a record. */
  tone?: "danger" | "neutral";
}) {
  const { run, busy } = useRun();
  return (
    <Sheet
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`btn ${tone === "danger" ? "btn-destructive" : "btn-primary"}`}
            disabled={busy}
            onClick={() =>
              run(async () => {
                await onConfirm();
                onClose();
              })
            }
          >
            {busy ? <Spinner /> : confirmLabel}
          </button>
        </>
      }
    >
      <p className="muted" style={{ lineHeight: 1.55 }}>
        {text}
      </p>
    </Sheet>
  );
}

export function Empty({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          className={o.value === value ? "on" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string | false;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="label">
        {label}
        {required && <span className="req">*</span>}
      </span>
      {children}
      {error ? <span className="field-error">{error}</span> : hint && <span className="hint-text">{hint}</span>}
    </label>
  );
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="card list">
      {Array.from({ length: rows }, (_, i) => (
        <div className="row" key={i}>
          <span className="skeleton" style={{ width: 40, height: 40, borderRadius: 20 }} />
          <div style={{ flex: 1, display: "grid", gap: 8 }}>
            <span className="skeleton" style={{ height: 13, width: "55%" }} />
            <span className="skeleton" style={{ height: 11, width: "35%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Toasts ─── */

const ToastContext = createContext<(message: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((m: string) => {
    setMessage(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2800);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {message && (
        <div className="toast" role="status" key={message}>
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/** Runs an async action with a busy flag; errors become toasts. */
export function useRun() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async <T,>(fn: () => Promise<T>, success?: string): Promise<T | undefined> => {
      setBusy(true);
      try {
        const result = await fn();
        if (success) toast(success);
        return result;
      } catch (e) {
        toast(errorMessage(e));
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );
  return { run, busy };
}
