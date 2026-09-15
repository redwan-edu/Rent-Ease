"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/lib/workspace";
import { Splash } from "@/components/ui";

export default function SettingsPaymentsRedirect() {
  const router = useRouter();
  const { to } = useWorkspace();

  useEffect(() => {
    router.replace(to("/payments"));
  }, [router, to]);

  return <Splash message="Opening payments…" />;
}
