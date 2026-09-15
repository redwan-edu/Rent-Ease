import type { Metadata } from "next";
import Link from "next/link";
import StatusScreen from "@/components/StatusScreen";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <StatusScreen
      code="404"
      title="This page doesn't exist"
      text="The link may be old or mistyped. Your tenants and payments are safe."
      actions={
        <>
          <Link href="/app" className="btn btn-primary">
            Open Rent Ease
          </Link>
          <Link href="/" className="btn btn-secondary">
            Home page
          </Link>
        </>
      }
    />
  );
}
