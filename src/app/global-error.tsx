"use client"; // Replaces the root layout when that layout itself fails

import StatusScreen from "@/components/StatusScreen";
import { themeBootScript } from "@/lib/theme";
import "./globals.css";

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Something went wrong · Rent Ease</title>
        {/* Global error renders its own document, so it applies the saved theme itself. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <StatusScreen
          code="Error"
          title="Rent Ease couldn't start"
          text="Something went wrong while opening the app. Nothing you saved was lost."
          actions={
            <>
              <button className="btn btn-primary" onClick={() => retry()}>
                Try again
              </button>
              {/* A full reload, not client navigation, is what a broken root layout needs. */}
              {/* eslint-disable-next-line @next/next/no-location-assign-relative-destination */}
              <button className="btn btn-secondary" onClick={() => window.location.assign("/")}>
                Home page
              </button>
            </>
          }
          footnote={error.digest && `Reference: ${error.digest}`}
        />
      </body>
    </html>
  );
}
