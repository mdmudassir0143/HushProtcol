import {LookoutForm} from "@/components/LookoutForm";
import {AppShell} from "@/components/AppShell";

export const metadata = {title: "Lookout · Hushh Protocol"};

export default function LookoutPage() {
  return (
    <AppShell
      title="Lookout"
      subtitle="Search a username or email. See if it is claimed and which wallet it resolves to."
    >
      <div className="animate-rise">
        <LookoutForm />
      </div>
    </AppShell>
  );
}
