import {Inbox} from "@/components/Inbox";
import {AppShell} from "@/components/AppShell";

export const metadata = {title: "Inbox · Hushh Protocol"};

export default function InboxPage() {
  return (
    <AppShell
      title="Inbox"
      subtitle="Decrypt notes sealed to your key, then claim tokens on Arc."
    >
      <Inbox />
    </AppShell>
  );
}
