"use client";

import {useEffect, useState} from "react";
import {resolveUser} from "@/lib/api";
import {isReservedPath, normalizeUsernameParam} from "@/lib/routes";
import {useSession} from "@/hooks/useSession";
import {walletsMatch} from "@/lib/session";
import {AccountView} from "@/components/AccountView";
import {PublicProfileView} from "@/components/PublicProfileView";
import {AppShell} from "@/components/AppShell";
import {LoaderIcon} from "@/components/icons";
import {Panel} from "@/components/ui";
import type {PublicUser} from "@/shared";

export function ProfilePage({username: raw}: {username: string}) {
  const username = normalizeUsernameParam(raw);
  const {user: me, ready} = useSession();
  const [profile, setProfile] = useState<PublicUser | null | undefined>(
    undefined
  );

  useEffect(() => {
    if (!username || isReservedPath(username)) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    setProfile(undefined);
    void resolveUser(username)
      .then((u) => {
        if (!cancelled) setProfile(u);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (!username || isReservedPath(username)) {
    return (
      <AppShell title="Not found" subtitle="This path is reserved.">
        <Panel className="text-center text-sm text-graphite">
          <a href="/" className="btn-primary">
            Home
          </a>
        </Panel>
      </AppShell>
    );
  }

  if (!ready || profile === undefined) {
    return (
      <AppShell title={`@${username}`} subtitle="Loading profile…">
        <Panel className="flex justify-center py-12">
          <LoaderIcon className="h-6 w-6 animate-spin text-graphite" />
        </Panel>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell
        title={`@${username}`}
        subtitle="This username is not claimed on Hushh Protocol yet."
      >
        <Panel className="space-y-4 text-center">
          <p className="text-2xl font-bold tracking-tight">@{username}</p>
          <p className="text-sm text-graphite">
            Not registered. No wallet is linked.
          </p>
          <a href="/register" className="btn-primary">
            Claim this username
          </a>
        </Panel>
      </AppShell>
    );
  }

  const isOwn =
    !!me &&
    (me.username === profile.username ||
      walletsMatch(me.wallet, profile.wallet));

  if (isOwn) {
    return (
      <AppShell
        title={`@${profile.username}`}
        subtitle="Your identity, balances, and silent payment history on Arc."
      >
        <AccountView />
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`@${profile.username}`}
      subtitle="Public Hushh profile. Pay them without linking yourself on-chain."
    >
      <PublicProfileView user={profile} />
    </AppShell>
  );
}
