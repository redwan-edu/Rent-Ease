import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";
import AuthScreen from "@/components/AuthScreen";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create a Rent Ease account and start tracking rent, tenants and properties from your phone.",
  alternates: { canonical: "/sign-up" },
};

export default function SignUpPage() {
  return (
    <AuthScreen>
      {/* Path routing keeps the email-code verification step on /sign-up/… */}
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
    </AuthScreen>
  );
}
