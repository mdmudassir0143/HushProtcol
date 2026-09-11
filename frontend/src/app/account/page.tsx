"use client";

import {useEffect} from "react";
import {useRouter} from "next/navigation";
import {useSession} from "@/hooks/useSession";
import {profilePath} from "@/lib/routes";
import {LoaderIcon} from "@/components/icons";
import {Panel} from "@/components/ui";
import {AppShell} from "@/components/AppShell";

/** Legacy /account → /{username} */
export default function AccountRedirectPage() {
  const router = useRouter();
  const {user, lookup, ready, needsUsername} = useSession();
  const username =
    user?.username ??
    (lookup?.username && lookup.username.length > 0 ? lookup.username : null);

  useEffect(() => {
    if (!ready) return;
    if (needsUsername || !username) {
      router.replace("/register");
      return;
    }
    router.replace(profilePath(username));
  }, [ready, needsUsername, username, router]);

  return (
    <AppShell title="Account" subtitle="Redirecting…">
      <Panel className="flex justify-center py-12">
        <LoaderIcon className="h-6 w-6 animate-spin text-graphite" />
      </Panel>
    </AppShell>
  );
}
