import {SendForm} from "@/components/SendForm";
import {AppShell} from "@/components/AppShell";

export const metadata = {title: "Send · Hushh Protocol"};

export default async function SendPage({
  searchParams,
}: {
  searchParams: Promise<{to?: string}>;
}) {
  const {to} = await searchParams;
  return (
    <AppShell
      title="Send"
      subtitle="Pay a username. Pick a pool token, deposit a note. Nothing on-chain links you to their claim."
    >
      <SendForm initialRecipient={to} />
    </AppShell>
  );
}
