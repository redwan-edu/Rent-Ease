import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";
import AuthScreen from "@/components/AuthScreen";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Rent Ease to see who paid, what's left and every tenant record.",
  alternates: { canonical: "/sign-in" },
};

export default function SignInPage() {
  return (
    <AuthScreen>
      {/* Path routing keeps "Forgot password?" and the reset steps on /sign-in/… */}
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
    </AuthScreen>
  );
}
