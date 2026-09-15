"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import { useEffect } from "react";
import StatusScreen from "@/components/StatusScreen";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      code="Error"
      title="Something went wrong"
      text="This screen couldn't load. Nothing you saved was lost. Try again, or go back to the app."
      actions={
        <>
          <button className="btn btn-primary" onClick={() => retry()}>
            Try again
          </button>
          <Link href="/app" className="btn btn-secondary">
            Open Rent Ease
          </Link>
        </>
      }
      footnote={error.digest && `Reference: ${error.digest}`}
    />
  );
}
