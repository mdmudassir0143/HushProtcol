import {RegisterFlow} from "@/components/RegisterFlow";
import {AppShell} from "@/components/AppShell";

export const metadata = {title: "Sign in · Hushh Protocol"};

export default function RegisterPage() {
  return (
    <AppShell
      title="Sign in"
      subtitle="Connect wallet → connect Twitter → sign. Your X handle is your Hushh username."
    >
      <RegisterFlow />
    </AppShell>
  );
}
