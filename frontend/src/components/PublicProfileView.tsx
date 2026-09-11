"use client";

import Link from "next/link";
import {explorerAddress} from "@/lib/config";
import {shortAddr} from "@/lib/address";
import type {PublicUser} from "@/shared";
import {UserAvatar} from "@/components/UserAvatar";
import {CheckIcon, ExternalLinkIcon} from "@/components/icons";
import {Panel} from "@/components/ui";

export function PublicProfileView({user}: {user: PublicUser}) {
  return (
    <Panel className="space-y-6 text-left">
      <div className="flex items-center gap-4">
        <UserAvatar address={user.wallet} size="lg" showName />
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-signal/10 px-3 py-1.5 text-signal">
            <CheckIcon className="h-4 w-4" />
            <p className="text-xs font-semibold tracking-wide">Claimed</p>
          </div>
          <p className="mt-3 truncate text-3xl font-bold tracking-tight">
            @{user.username}
          </p>
          {user.twitterUsername ? (
            <p className="mt-1 text-sm text-graphite">
              X · @{user.twitterUsername}
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-fog/80 bg-white/80 px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-graphite">
          Wallet
        </p>
        <p
          className="mt-2 font-mono text-sm leading-relaxed text-ink"
          title={user.wallet}
        >
          {shortAddr(user.wallet)}
        </p>
        <a
          href={explorerAddress(user.wallet)}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-ink transition-opacity hover:opacity-70"
        >
          View on arcscan
          <ExternalLinkIcon className="h-3.5 w-3.5" />
        </a>
      </div>

      <Link
        href={`/send?to=${encodeURIComponent(user.username)}`}
        className="btn-primary"
      >
        Pay @{user.username}
      </Link>
    </Panel>
  );
}
