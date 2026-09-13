import JoinInvite from "@/components/JoinInvite";

export const metadata = { title: "Join a workspace · Rent Ease" };

/** Invite link: /join?w=<workspaceId>, shared by a workspace owner. */
export default async function JoinPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const { w } = await searchParams;
  return <JoinInvite workspaceId={w ?? ""} />;
}
