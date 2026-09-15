import type { ReactNode } from "react";
import { Logo } from "./ui";

export default function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <div className="auth-brand">
        <Logo size={56} />
        <h1>Rent Ease</h1>
        <p>Track rent, tenants and properties from your phone.</p>
      </div>
      <div className="auth-card">{children}</div>
    </div>
  );
}
