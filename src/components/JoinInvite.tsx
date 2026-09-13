"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { MailWarning, ShieldAlert, UserCheck, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@convex/_generated/api";
import AuthScreen from "./AuthScreen";
import { Spinner } from "./ui";
import VerifyEmail from "./VerifyEmail";
import { BootError, useBootstrap } from "@/lib/bootstrap";
import { rememberWorkspace } from "@/lib/workspace";
import { roleLabel } from "@/lib/workspace";

/**
 * Where an invite link lands. Signed-out visitors are told which address to
 * sign up with; signed-in ones go straight in, or learn exactly why they can't.
 */
export default function JoinInvite({ workspaceId }: { workspaceId: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const back = `/join?w=${encodeURIComponent(workspaceId)}`;

  if (!isLoaded) {
    return (
      <AuthScreen>
        <Center>
          <Spinner />
        </Center>
      </AuthScreen>
    );
  }

  if (!isSignedIn) {
    return (
      <AuthScreen>
        <div className="join">
          <span className="join-icon">
            <Users size={22} />
          </span>
          <h2>You&apos;ve been invited</h2>
          <p>
            Someone added you to their Rent Ease workspace. Sign in — or create an account — using
            <strong> the exact email address they invited</strong>, and it opens automatically.
          </p>
          <Link className="btn btn-primary btn-block" href={`/sign-up?redirect_url=${encodeURIComponent(back)}`}>
            Create account
          </Link>
          <Link className="btn btn-secondary btn-block" href={`/sign-in?redirect_url=${encodeURIComponent(back)}`}>
            I already have an account
          </Link>
        </div>
      </AuthScreen>
    );
  }

  return <SignedInJoin workspaceId={workspaceId} back={back} />;
}

function SignedInJoin({ workspaceId, back }: { workspaceId: string; back: string }) {
  const { workspaces, error, unverified } = useBootstrap();
  const invite = useQuery(api.workspaces.invite, workspaces ? { workspaceId } : "skip");
  const acknowledge = useMutation(api.members.acknowledge);
  const { signOut, openUserProfile } = useClerk();
  const router = useRouter();

  useEffect(() => {
    if (invite?.status !== "member") return;
    rememberWorkspace(invite.workspaceId);
    acknowledge({ workspaceId: invite.workspaceId })
      .catch(() => {})
      .finally(() => router.replace(`/${invite.workspaceId}`));
  }, [invite, acknowledge, router]);

  if (error) return <BootError message={error} />;
  if (unverified) return <VerifyEmail />;

  const own = workspaces?.[0];
  const openOwn = own && (
    <Link className="btn btn-secondary btn-block" href={`/${own.workspaceId}`}>
      Open my own workspace
    </Link>
  );

  if (!invite || invite.status === "member" || invite.status === "owner") {
    if (invite?.status === "owner") {
      return (
        <AuthScreen>
          <div className="join">
            <span className="join-icon">
              <UserCheck size={22} />
            </span>
            <h2>This is your workspace</h2>
            <p>This is the invite link for your own workspace. Share it with the people you added to your team.</p>
            {openOwn}
          </div>
        </AuthScreen>
      );
    }
    return (
      <AuthScreen>
        <Center>
          <Spinner />
          {invite?.status === "member" && <p>Opening {invite.ownerName}&apos;s workspace as {roleLabel[invite.role]}…</p>}
        </Center>
      </AuthScreen>
    );
  }

  if (invite.status === "invalid") {
    return (
      <AuthScreen>
        <div className="join">
          <span className="join-icon warn">
            <ShieldAlert size={22} />
          </span>
          <h2>This link doesn&apos;t work</h2>
          <p>The invite link is incomplete or the workspace no longer exists. Ask for a fresh link.</p>
          {openOwn}
        </div>
      </AuthScreen>
    );
  }

  if (invite.status === "unverified") {
    return (
      <AuthScreen>
        <div className="join">
          <span className="join-icon warn">
            <MailWarning size={22} />
          </span>
          <h2>Verify your email first</h2>
          <p>
            {invite.ownerName} invited <strong>{invite.email}</strong>, but that address hasn&apos;t been
            verified yet. Verify it in your account, then open this link again.
          </p>
          <button className="btn btn-primary btn-block" onClick={() => openUserProfile()}>
            Verify email
          </button>
          {openOwn}
        </div>
      </AuthScreen>
    );
  }

  // not-invited
  return (
    <AuthScreen>
      <div className="join">
        <span className="join-icon warn">
          <MailWarning size={22} />
        </span>
        <h2>Wrong email address</h2>
        <p>
          You&apos;re signed in as <strong>{invite.email || "an account with no email"}</strong>, but{" "}
          {invite.ownerName} hasn&apos;t added that address to their team. Ask them to add it — or sign in
          with the address they invited.
        </p>
        <button
          className="btn btn-primary btn-block"
          onClick={() => signOut({ redirectUrl: `/sign-in?redirect_url=${encodeURIComponent(back)}` })}
        >
          Use a different account
        </button>
        {openOwn}
      </div>
    </AuthScreen>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="join join-center">{children}</div>;
}
