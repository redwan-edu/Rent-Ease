"use client";

import { useQuery } from "convex/react";
import { Lock, UserX } from "lucide-react";
import { useParams } from "next/navigation";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import Header from "@/components/Header";
import TenantForm from "@/components/TenantForm";
import { Empty, Splash } from "@/components/ui";
import { useWorkspace } from "@/lib/workspace";

export default function EditTenantPage() {
  const { id } = useParams<{ id: string }>();
  const tenantId = id as Id<"tenants">;
  const tenant = useQuery(api.tenants.get, { tenantId });
  const { can } = useWorkspace();

  return (
    <>
      <Header title="Edit tenant" back={`/tenants/${id}`} bell={false} />
      {tenant === undefined ? (
        <Splash />
      ) : tenant === null ? (
        <Empty icon={<UserX size={22} />} title="Tenant not found" />
      ) : !can("edit") ? (
        <Empty icon={<Lock size={22} />} title="Read-only access" text="Ask the owner for edit access." />
      ) : (
        <TenantForm initial={tenant} />
      )}
    </>
  );
}
