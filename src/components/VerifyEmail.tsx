"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import AuthScreen from "./AuthScreen";
import { Spinner } from "./ui";

function clerkMessage(e: unknown) {
  const err = e as { errors?: { longMessage?: string; message?: string }[]; message?: string };
  return err.errors?.[0]?.longMessage ?? err.errors?.[0]?.message ?? err.message ?? "Something went wrong.";
}

/**
 * Blocks the app until the account's email is verified. Rent Ease grants team
 * access by email address, so an unproven address must never get in.
 */
export default function VerifyEmail() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const email = user?.primaryEmailAddress;
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!email) return;
    setBusy(true);
    setError(null);
    try {
      await email.prepareVerification({ strategy: "email_code" });
      setSent(true);
    } catch (e) {
      setError(clerkMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!email) return;
    setBusy(true);
    setError(null);
    try {
      await email.attemptVerification({ code: code.trim() });
      await user?.reload();
      // A fresh load gets a new session token carrying the verified address.
      window.location.reload();
    } catch (e) {
      setError(clerkMessage(e));
      setBusy(false);
    }
  };

  return (
    <AuthScreen>
      <div className="join">
        <span className="join-icon warn">
          <MailCheck size={22} />
        </span>
        <h2>Verify your email</h2>
        <p>
          {sent ? "We sent a 6-digit code to " : "Before you can use Rent Ease, confirm you own "}
          <strong>{email?.emailAddress}</strong>.
        </p>

        {sent && (
          <input
            className="input"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Enter the code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && code.length === 6 && !busy && verify()}
            style={{ textAlign: "center", letterSpacing: "0.3em", fontSize: 20 }}
            autoFocus
          />
        )}
        {error && <span className="field-error">{error}</span>}

        {sent ? (
          <>
            <button className="btn btn-primary btn-block" disabled={code.length !== 6 || busy} onClick={verify}>
              {busy ? <Spinner /> : "Verify email"}
            </button>
            <button className="btn btn-ghost btn-block" disabled={busy} onClick={send}>
              Send a new code
            </button>
          </>
        ) : (
          <button className="btn btn-primary btn-block" disabled={busy || !email} onClick={send}>
            {busy ? <Spinner /> : "Send verification code"}
          </button>
        )}
        <button className="btn btn-secondary btn-block" onClick={() => signOut({ redirectUrl: "/sign-in" })}>
          Use a different account
        </button>
      </div>
    </AuthScreen>
  );
}
