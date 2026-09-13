import { SignIn } from "@clerk/nextjs";
import AuthScreen from "@/components/AuthScreen";

export default function SignInPage() {
  return (
    <AuthScreen>
      {/* Path routing keeps "Forgot password?" and the reset steps on /sign-in/… */}
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
    </AuthScreen>
  );
}
