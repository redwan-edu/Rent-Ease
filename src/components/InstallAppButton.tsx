"use client";

import {
  Check,
  Download,
  EllipsisVertical,
  Monitor,
  Share,
  Smartphone,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Sheet } from "./ui";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "desktop";

function getPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  ) {
    return "ios";
  }
  if (/Android/i.test(ua)) {
    return "android";
  }
  return "desktop";
}

interface InstallAppButtonProps {
  variant?: "ghost" | "primary" | "secondary";
  size?: "sm" | "md";
  className?: string;
  label?: string;
}

/**
 * Install shortcut that shows no matter what (unless already running in standalone mode).
 * Triggers the browser install prompt if available, or presents step-by-step instructions.
 */
export default function InstallAppButton({
  variant = "ghost",
  size = "sm",
  className = "",
  label = "Install app",
}: InstallAppButtonProps) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [isStandalone, setIsStandalone] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");

  useEffect(() => {
    setPlatform(getPlatform());

    const standaloneCheck =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        (navigator as { standalone?: boolean }).standalone === true);
    if (standaloneCheck) {
      setIsStandalone(true);
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setDeferred(null);
      setIsStandalone(true);
      setShowGuide(false);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Hide button if already running as an installed standalone PWA
  if (isStandalone) return null;

  const handleInstallClick = async () => {
    if (deferred) {
      try {
        await deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome === "accepted") {
          setDeferred(null);
          return;
        }
      } catch {
        // Fall back to guide if prompt fails
        setShowGuide(true);
        return;
      }
    }
    // No native prompt available (iOS Safari, Firefox, or Chrome before heuristic)
    setShowGuide(true);
  };

  const btnClass = [
    "btn",
    variant === "primary"
      ? "btn-primary"
      : variant === "secondary"
        ? "btn-secondary"
        : "btn-ghost",
    size === "sm" ? "btn-sm" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <button
        type="button"
        className={btnClass}
        onClick={handleInstallClick}
        title="Install Rent Ease as an app"
      >
        <Download size={16} />
        <span>{label}</span>
      </button>

      {showGuide && (
        <Sheet
          title="Install Rent Ease"
          onClose={() => setShowGuide(false)}
          footer={
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => setShowGuide(false)}
            >
              <Check size={16} /> Got it
            </button>
          }
        >
          <div className="stack" style={{ gap: 16 }}>
            {platform === "ios" && (
              <>
                <div className="hint">
                  <Smartphone size={20} />
                  <div>
                    <strong>Install on iPhone or iPad</strong>
                    <p style={{ marginTop: 4 }}>
                      Apple devices require adding the app through Safari.
                    </p>
                  </div>
                </div>

                <div
                  className="card card-pad"
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      className="badge"
                      style={{ minWidth: 24, justifyContent: "center" }}
                    >
                      1
                    </span>
                    <div>
                      Tap the <strong>Share</strong> button{" "}
                      <Share
                        size={15}
                        style={{ display: "inline", verticalAlign: "middle" }}
                      />{" "}
                      in Safari&apos;s bottom toolbar.
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      className="badge"
                      style={{ minWidth: 24, justifyContent: "center" }}
                    >
                      2
                    </span>
                    <div>
                      Scroll down and tap <strong>Add to Home Screen</strong>.
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      className="badge"
                      style={{ minWidth: 24, justifyContent: "center" }}
                    >
                      3
                    </span>
                    <div>
                      Tap <strong>Add</strong> in the top right corner. Rent
                      Ease will appear on your Home Screen.
                    </div>
                  </div>
                </div>
              </>
            )}

            {platform === "android" && (
              <>
                <div className="hint">
                  <Smartphone size={20} />
                  <div>
                    <strong>Install on Android</strong>
                    <p style={{ marginTop: 4 }}>
                      Add Rent Ease directly to your home screen or app drawer.
                    </p>
                  </div>
                </div>

                <div
                  className="card card-pad"
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      className="badge"
                      style={{ minWidth: 24, justifyContent: "center" }}
                    >
                      1
                    </span>
                    <div>
                      Tap the <strong>three dots menu</strong>{" "}
                      <EllipsisVertical
                        size={15}
                        style={{ display: "inline", verticalAlign: "middle" }}
                      />{" "}
                      in Chrome&apos;s top right corner.
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      className="badge"
                      style={{ minWidth: 24, justifyContent: "center" }}
                    >
                      2
                    </span>
                    <div>
                      Tap <strong>Install app</strong> or{" "}
                      <strong>Add to Home screen</strong>.
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      className="badge"
                      style={{ minWidth: 24, justifyContent: "center" }}
                    >
                      3
                    </span>
                    <div>
                      Confirm to install. Rent Ease will open in its own app
                      window.
                    </div>
                  </div>
                </div>
              </>
            )}

            {platform === "desktop" && (
              <>
                <div className="hint">
                  <Monitor size={20} />
                  <div>
                    <strong>Install on your computer</strong>
                    <p style={{ marginTop: 4 }}>
                      Runs in a standalone window with fast desktop access.
                    </p>
                  </div>
                </div>

                <div
                  className="card card-pad"
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      className="badge"
                      style={{ minWidth: 24, justifyContent: "center" }}
                    >
                      1
                    </span>
                    <div>
                      Look for the <strong>Install icon</strong> (
                      <Download
                        size={14}
                        style={{ display: "inline", verticalAlign: "middle" }}
                      />{" "}
                      or computer icon) in your browser address bar on the
                      right.
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      className="badge"
                      style={{ minWidth: 24, justifyContent: "center" }}
                    >
                      2
                    </span>
                    <div>
                      Or click the browser menu{" "}
                      <EllipsisVertical
                        size={14}
                        style={{ display: "inline", verticalAlign: "middle" }}
                      />{" "}
                      and select <strong>Install Rent Ease</strong>.
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      className="badge"
                      style={{ minWidth: 24, justifyContent: "center" }}
                    >
                      3
                    </span>
                    <div>
                      Rent Ease will install and launch in its own desktop
                      window.
                    </div>
                  </div>
                </div>
              </>
            )}

            <p className="hint-text">
              Once installed, open Rent Ease from your home screen or desktop to
              sign in or create an account.
            </p>
          </div>
        </Sheet>
      )}
    </>
  );
}
