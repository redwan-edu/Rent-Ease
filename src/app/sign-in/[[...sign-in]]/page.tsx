import { SignIn } from "@clerk/nextjs";
import AuthScreen from "@/components/AuthScreen";

export default function SignInPage() {
  return (
    <AuthScreen>
      <SignIn />
    </AuthScreen>
  );
}
