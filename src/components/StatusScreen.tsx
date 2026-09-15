import type { ReactNode } from "react";
import { Logo } from "./ui";

/** Calm full-page notice for "not found" and "something went wrong". */
export default function StatusScreen({
  code,
  title,
  text,
  actions,
  footnote,
}: {
  code: string;
  title: string;
  text: string;
  actions: ReactNode;
  footnote?: ReactNode;
}) {
  return (
    <main className="status-screen">
      <div className="status-card">
        <Logo size={40} />
        <span className="status-code">{code}</span>
        <h1>{title}</h1>
        <p>{text}</p>
        <div className="status-actions">{actions}</div>
        {footnote && <p className="status-foot">{footnote}</p>}
      </div>
    </main>
  );
}
