"use client";

import { Lock } from "lucide-react";
import { useParams } from "next/navigation";
import type { Id } from "@convex/_generated/dataModel";
import FamilyForm from "@/components/FamilyForm";
import Header from "@/components/Header";
import { Empty } from "@/components/ui";
import { useWorkspace } from "@/lib/workspace";

export default function NewFamilyMemberPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useWorkspace();
  return (
    <>
      <Header title="Add family member" back={`/tenants/${id}`} bell={false} />
      {can("edit") ? (
        <FamilyForm tenantId={id as Id<"tenants">} />
      ) : (
        <Empty icon={<Lock size={22} />} title="Read-only access" text="Ask the owner for edit access." />
      )}
    </>
  );
}
