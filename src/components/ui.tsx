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
import { errorMessage, hue, initials } from "@/lib/format";

export function Logo({ size = 44 }: { size?: number }) {
  return (
    <span className="logo" style={{ width: size, height: size, borderRadius: size * 0.3 }}>
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20h14V9.5" />
        <circle cx="12" cy="14" r="2.2" fill="#86d8ab" stroke="none" />
      </svg>
    </span>
  );
}

export function Splash({ message, action }: { message?: string; action?: ReactNode }) {
  return (
    <div className="splash">
      <Logo size={56} />
      {message ? <p className="splash-msg">{message}</p> : <span className="spinner" />}
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
  size = 44,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  const h = hue(name);
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `hsl(${h} 42% 91%)`,
        color: `hsl(${h} 32% 30%)`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt="" /> : initials(name)}
    </span>
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
        <header className="header compact">
          <button className="icon-btn" onClick={onBack} aria-label="Back">
            <ChevronLeft size={20} />
          </button>
          <div className="header-text">
            <h1 className="header-title">{title}</h1>
          </div>
        </header>
        {children}
      </div>
    </div>,
    root,
  );
}

/**
 * Press-and-hold confirm: the button fills left to right (with a progress bar
 * above it) and only fires once held for the full duration.
 */
export function HoldButton({
  label,
  doneLabel,
  duration = 1000,
  disabled,
  onComplete,
}: {
  label: string;
  doneLabel: string;
  duration?: number;
  disabled?: boolean;
  onComplete: () => Promise<boolean>;
}) {
  const [phase, setPhase] = useState<"idle" | "holding" | "busy" | "done">("idle");
  const phaseRef = useRef(phase);
  const progress = useRef(0);
  const startedAt = useRef(0);
  const frame = useRef(0);
  const trackFill = useRef<HTMLSpanElement>(null);
  const buttonFill = useRef<HTMLSpanElement>(null);

  const set = (p: typeof phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const paint = (p: number, animate: boolean) => {
    for (const el of [trackFill.current, buttonFill.current]) {
      if (!el) continue;
      el.style.transition = animate ? "transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)" : "none";
      el.style.transform = `scaleX(${p})`;
    }
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
      <div className="hold-track" aria-hidden>
        <span ref={trackFill} />
      </div>
      <button
        type="button"
        className={`btn btn-primary hold-btn ${phase}`}
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
        <span ref={buttonFill} className="hold-fill" />
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
}: {
  title: string;
  text: string;
  confirmLabel: string;
  onConfirm: () => Promise<unknown>;
  onClose: () => void;
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
            className="btn btn-primary"
            style={{ background: "var(--danger)" }}
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
      <p className="muted" style={{ lineHeight: 1.5 }}>
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
          <span className="skeleton" style={{ width: 44, height: 44, borderRadius: 22 }} />
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
