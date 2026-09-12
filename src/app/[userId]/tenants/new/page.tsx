"use client";

import Header from "@/components/Header";
import TenantForm from "@/components/TenantForm";
import { Empty } from "@/components/ui";
import { useWorkspace } from "@/lib/workspace";
import { Lock } from "lucide-react";

export default function NewTenantPage() {
  const { can } = useWorkspace();
  return (
    <>
      <Header title="New tenant" back="/tenants" bell={false} />
      {can("edit") ? (
        <TenantForm />
      ) : (
        <Empty icon={<Lock size={22} />} title="Read-only access" text="Ask the owner for edit access to add tenants." />
      )}
    </>
  );
}
