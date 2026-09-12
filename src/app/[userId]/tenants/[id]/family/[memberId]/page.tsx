"use client";

import { useQuery } from "convex/react";
import { UserX } from "lucide-react";
import { useParams } from "next/navigation";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import FamilyForm from "@/components/FamilyForm";
import Header from "@/components/Header";
import { Empty, Splash } from "@/components/ui";

export default function FamilyMemberPage() {
  const { id, memberId } = useParams<{ id: string; memberId: string }>();
  const member = useQuery(api.family.get, { memberId: memberId as Id<"familyMembers"> });

  return (
    <>
      <Header title={member?.name ?? "Family member"} back={`/tenants/${id}`} bell={false} />
      {member === undefined ? (
        <Splash />
      ) : member === null ? (
        <Empty icon={<UserX size={22} />} title="Family member not found" />
      ) : (
        <FamilyForm tenantId={member.tenantId} initial={member} />
      )}
    </>
  );
}
