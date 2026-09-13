import { SignUp } from "@clerk/nextjs";
import AuthScreen from "@/components/AuthScreen";

export default function SignUpPage() {
  return (
    <AuthScreen>
      {/* Path routing keeps the email-code verification step on /sign-up/… */}
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
    </AuthScreen>
  );
}
