import { SignUp } from "@clerk/nextjs";
import AuthScreen from "@/components/AuthScreen";

export default function SignUpPage() {
  return (
    <AuthScreen>
      <SignUp />
    </AuthScreen>
  );
}
