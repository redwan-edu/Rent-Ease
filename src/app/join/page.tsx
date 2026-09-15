import JoinInvite from "@/components/JoinInvite";

// Invite links are personal, so they stay out of search results.
export const metadata = { title: "Join a workspace", robots: { index: false, follow: false } };

/** Invite link: /join?w=<workspaceId>, shared by a workspace owner. */
export default async function JoinPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const { w } = await searchParams;
  return <JoinInvite workspaceId={w ?? ""} />;
}
