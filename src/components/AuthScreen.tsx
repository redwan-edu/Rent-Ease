import { Bell, ShieldCheck, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "./ui";

export default function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <div className="auth-brand">
        <Logo size={60} />
        <h1>Rent Ease</h1>
        <p>Collect rent, keep tenant records and never miss a follow-up.</p>
      </div>
      <div className="auth-card">{children}</div>
      <div className="auth-foot">
        <span>
          <ShieldCheck size={14} /> Secure
        </span>
        <span>
          <Users size={14} /> Team access
        </span>
        <span>
          <Bell size={14} /> Reminders
        </span>
      </div>
    </div>
  );
}
