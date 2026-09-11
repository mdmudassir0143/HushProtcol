"use client";

import {useCallback, useEffect, useState} from "react";
import {usePrivy} from "@privy-io/react-auth";
import {linkTwitter, unlinkTwitter} from "@/lib/api";
import {getToken, setStoredUser} from "@/lib/session";
import {toast} from "@/lib/toast";
import {formatError} from "@/lib/errors";
import {useSession} from "@/hooks/useSession";
import {twitterHandleFromPrivyUser} from "@/lib/twitter";
import {LoaderIcon, XBrandIcon} from "@/components/icons";
import {shortAddr} from "@/lib/address";

function ConnectTwitterCardInner({className = ""}: {className?: string}) {
  const {user: hushUser, isSignedIn, token} = useSession();
  const {
    ready,
    authenticated,
    user: privyUser,
    login,
    logout,
    getAccessToken,
  } = usePrivy();
  const [busy, setBusy] = useState(false);

  const linkedHandle =
    hushUser?.twitterUsername ??
    hushUser?.username ??
    twitterHandleFromPrivyUser(privyUser);

  // Username was claimed via the Twitter flow — never ask to connect Twitter again.
  const alreadyClaimedOnHushh = !!hushUser?.username;
  const twitterLinkedOnServer = !!hushUser?.twitterUsername;

  const syncLink = useCallback(async () => {
    if (!isSignedIn || !token || !authenticated || !privyUser) return;
    if (twitterLinkedOnServer || alreadyClaimedOnHushh) return;
    const handle = twitterHandleFromPrivyUser(privyUser);
    if (!handle) return;
    if (
      hushUser?.twitterUsername === handle ||
      hushUser?.username === handle
    ) {
      return;
    }

    const accessToken = await getAccessToken();
    if (!accessToken) return;

    setBusy(true);
    try {
      const updated = await linkTwitter(token, {privyAccessToken: accessToken});
      setStoredUser(updated);
      toast.success(`Linked @${updated.twitterUsername ?? handle}`);
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setBusy(false);
    }
  }, [
    alreadyClaimedOnHushh,
    authenticated,
    getAccessToken,
    hushUser?.twitterUsername,
    hushUser?.username,
    isSignedIn,
    privyUser,
    token,
    twitterLinkedOnServer,
  ]);

  useEffect(() => {
    void syncLink();
  }, [syncLink]);

  if (!isSignedIn) {
    return (
      <div
        className={`rounded-2xl border border-fog/80 bg-paper/50 px-4 py-3.5 ${className}`}
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-graphite">
          Twitter
        </p>
        <p className="mt-1 text-sm text-graphite">
          Your claimed username comes from Twitter. Sign in first.
        </p>
      </div>
    );
  }

  async function onConnect() {
    setBusy(true);
    try {
      if (!authenticated) {
        login();
        return;
      }
      await syncLink();
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  async function onUnlink() {
    const auth = getToken();
    if (!auth) return;
    setBusy(true);
    try {
      const updated = await unlinkTwitter(auth);
      setStoredUser(updated);
      if (authenticated) await logout();
      toast.info("Twitter disconnected.");
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  const claimedViaTwitter = alreadyClaimedOnHushh;

  return (
    <div
      className={`rounded-2xl border border-fog/80 bg-white px-4 py-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
          <XBrandIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-graphite">
            Twitter
          </p>
          {linkedHandle ? (
            <>
              <p className="mt-1 text-lg font-bold tracking-tight text-ink">
                @{linkedHandle}
              </p>
              <p className="mt-0.5 text-xs text-graphite">
                {claimedViaTwitter
                  ? "Your claimed Hushh username"
                  : `Linked to ${shortAddr(hushUser?.wallet)}`}
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm font-semibold text-ink">
                Connect your Twitter
              </p>
              <p className="mt-0.5 text-xs text-graphite">
                Confirm the X account that matches @{hushUser?.username}.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Only offer connect/disconnect when username is not already claimed. */}
      {!alreadyClaimedOnHushh ? (
        <div className="mt-4">
          <button
            type="button"
            disabled={busy || !ready}
            onClick={() => void onConnect()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition-transform duration-200 hover:bg-ink/90 active:scale-[0.98] disabled:opacity-50"
          >
            {busy || !ready ? (
              <LoaderIcon className="h-4 w-4 animate-spin" />
            ) : (
              <XBrandIcon className="h-4 w-4" />
            )}
            Connect with Twitter
          </button>
        </div>
      ) : twitterLinkedOnServer ? (
        <div className="mt-4">
          <button
            type="button"
            disabled={busy || !ready}
            onClick={() => void onUnlink()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-fog bg-paper px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-graphite disabled:opacity-50"
          >
            {busy ? <LoaderIcon className="h-4 w-4 animate-spin" /> : null}
            Disconnect Twitter
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ConnectTwitterCard({
  className = "",
}: {
  className?: string;
}) {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return (
      <div
        className={`rounded-2xl border border-fog/80 bg-paper/50 px-4 py-3.5 text-sm text-graphite ${className}`}
      >
        Set <span className="font-mono text-xs">NEXT_PUBLIC_PRIVY_APP_ID</span>{" "}
        to enable Connect with Twitter.
      </div>
    );
  }

  return <ConnectTwitterCardInner className={className} />;
}
