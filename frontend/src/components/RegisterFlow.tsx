"use client";

import {useEffect, useState} from "react";
import {useAccount, useSignMessage} from "wagmi";
import {usePrivy} from "@privy-io/react-auth";
import {
  getAuthMessage,
  walletAuth,
  resolveUserByWallet,
  linkTwitter,
} from "@/lib/api";
import {getOrCreateHushKeys} from "@/lib/crypto";
import {setSession, setWalletLookup, walletsMatch} from "@/lib/session";
import {
  clearStoredAuthSignature,
  getStoredAuthSignature,
  setStoredAuthSignature,
} from "@/lib/authSignature";
import {
  TWITTER_USERNAME_RE,
  twitterHandleFromPrivyUser,
} from "@/lib/twitter";
import {toast} from "@/lib/toast";
import {celebrateUsernameClaim} from "@/lib/celebrate";
import {useSession} from "@/hooks/useSession";
import {useSignOut} from "@/hooks/useSignOut";
import {ConnectButton} from "@/components/ConnectButton";
import {NetworkGate} from "@/components/NetworkGate";
import {LoaderIcon, CheckIcon, XBrandIcon} from "@/components/icons";
import {ErrorBanner, Panel} from "@/components/ui";
import {formatError, formatErrorTitle} from "@/lib/errors";
import {shortAddr} from "@/lib/address";

function AuthSteps({
  step,
  skipTwitter,
}: {
  step: 1 | 2 | 3;
  skipTwitter?: boolean;
}) {
  const steps = skipTwitter
    ? [
        {n: 1 as const, label: "Wallet"},
        {n: 3 as const, label: "Sign"},
      ]
    : [
        {n: 1 as const, label: "Wallet"},
        {n: 2 as const, label: "Twitter"},
        {n: 3 as const, label: "Sign"},
      ];

  return (
    <ol className="mb-6 flex items-center gap-2">
      {steps.map((s, i) => {
        const active = step === s.n || (skipTwitter && step === 3 && s.n === 3);
        const done = skipTwitter
          ? s.n === 1 && step >= 3
          : step > s.n;
        return (
          <li key={s.n} className="flex min-w-0 flex-1 items-center gap-2">
            {i > 0 ? <span className="h-px w-3 shrink-0 bg-fog" /> : null}
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-medium ${
                done || active
                  ? "bg-ink text-paper"
                  : "border border-fog bg-white text-graphite"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span
              className={`truncate text-xs font-medium ${
                active ? "text-ink" : "text-graphite"
              }`}
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function RegisterFlowInner() {
  const {address, isConnected} = useAccount();
  const {signMessageAsync} = useSignMessage();
  const {user, isSignedIn, ready, hasCachedSignature, lookup} =
    useSession();
  const signOut = useSignOut();
  const {
    ready: privyReady,
    authenticated,
    user: privyUser,
    login,
    getAccessToken,
  } = usePrivy();

  const twitterHandle = twitterHandleFromPrivyUser(privyUser);
  const [lookingUp, setLookingUp] = useState(false);
  const [known, setKnown] = useState(false);
  const [knownUsername, setKnownUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [justClaimed, setJustClaimed] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) {
      setKnown(false);
      setKnownUsername("");
      setLookingUp(false);
      return;
    }
    let cancelled = false;
    setLookingUp(true);
    setError("");
    (async () => {
      try {
        const profile = await resolveUserByWallet(address);
        if (cancelled) return;
        if (profile) {
          setKnown(true);
          setKnownUsername(profile.username);
          setWalletLookup({wallet: address, username: profile.username});
        } else {
          setKnown(false);
          setKnownUsername("");
          setWalletLookup({wallet: address, username: null});
        }
      } catch (e) {
        if (!cancelled) setError(formatError(e));
      } finally {
        if (!cancelled) setLookingUp(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, isConnected, user?.id, user?.username]);

  async function signInOrRegister(mode: "signin" | "register") {
    setError("");
    if (!address) {
      toast.info("Connect your wallet first.");
      setError("Connect a wallet first.");
      return;
    }

    const clean =
      mode === "register"
        ? (twitterHandle || "").trim().toLowerCase().replace(/^@/, "")
        : (user?.username || knownUsername)
            .trim()
            .toLowerCase()
            .replace(/^@/, "");

    if (!TWITTER_USERNAME_RE.test(clean)) {
      const msg =
        mode === "register"
          ? "Connect Twitter first. Your X handle becomes your Hushh username."
          : "Username on this account is invalid.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setBusy(true);
    try {
      const keys = getOrCreateHushKeys(address);
      const cached = getStoredAuthSignature(address);
      let signature = cached;

      if (!signature) {
        const message = await getAuthMessage({
          wallet: address,
          username: clean,
          bulletPublicKey: keys.publicKey,
        });
        signature = await signMessageAsync({message});
        setStoredAuthSignature(address, signature);
      }

      let res;
      try {
        res = await walletAuth({
          wallet: address,
          username: clean,
          bulletPublicKey: keys.publicKey,
          signature,
        });
      } catch (e) {
        if (!cached) throw e;
        clearStoredAuthSignature(address);
        const message = await getAuthMessage({
          wallet: address,
          username: clean,
          bulletPublicKey: keys.publicKey,
        });
        signature = await signMessageAsync({message});
        setStoredAuthSignature(address, signature);
        res = await walletAuth({
          wallet: address,
          username: clean,
          bulletPublicKey: keys.publicKey,
          signature,
        });
      }

      setStoredAuthSignature(address, signature);
      setSession(res.token, res.user);
      setKnown(true);
      setKnownUsername(res.user.username);

      // Persist Twitter link on the same wallet user (best-effort).
      if (mode === "register" && authenticated) {
        try {
          const accessToken = await getAccessToken();
          if (accessToken) {
            const linked = await linkTwitter(res.token, {
              privyAccessToken: accessToken,
            });
            setSession(res.token, linked);
          }
        } catch {
          // Username is already claimed; Twitter metadata can be linked later on profile.
        }
      }

      toast.success(
        mode === "register"
          ? `Claimed @${res.user.username}`
          : cached && signature === cached
            ? `Welcome back @${res.user.username}`
            : `Signed in as @${res.user.username}`
      );
      if (mode === "register") {
        setJustClaimed(true);
        celebrateUsernameClaim();
      }
    } catch (e) {
      const msg = formatError(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <Panel className="flex justify-center py-10">
        <LoaderIcon className="h-6 w-6 animate-spin text-graphite" />
      </Panel>
    );
  }

  if (isSignedIn && user && walletsMatch(user.wallet, address ?? user.wallet)) {
    return (
      <Panel className="animate-rise space-y-5 text-left">
        <div className="flex items-center gap-2 text-signal">
          <CheckIcon className="h-5 w-5" />
          <p className="text-sm font-medium text-ink">
            {justClaimed ? "Username claimed" : "Signed in"}
          </p>
        </div>
        <div>
          <p
            className={`text-3xl font-bold tracking-tight ${
              justClaimed
                ? "animate-amount-pop motion-reduce:animate-none"
                : ""
            }`}
          >
            @{user.username}
          </p>
          <p className="mt-2 truncate font-mono text-xs text-graphite" title={user.wallet}>
            {shortAddr(user.wallet)}
          </p>
          {justClaimed ? (
            <p className="mt-2 text-sm text-graphite">
              Your Twitter handle is now your Hushh username.
            </p>
          ) : null}
        </div>
        <NetworkGate>
          <div className="flex flex-col gap-2 sm:flex-row">
            <a href={`/${encodeURIComponent(user.username)}`} className="btn-primary">
              View profile
            </a>
            <a href="/send" className="btn-ghost">
              Send
            </a>
          </div>
        </NetworkGate>
        <button
          type="button"
          onClick={() => signOut({redirect: "/"})}
          className="btn-ghost"
        >
          Sign out
        </button>
      </Panel>
    );
  }

  const hasClaimedUsername =
    known ||
    !!knownUsername ||
    !!user?.username ||
    !!lookup?.username;

  // Existing DB users only sign in — never prompt Twitter again.
  const needsClaim = isConnected && !hasClaimedUsername;

  const step: 1 | 2 | 3 = !isConnected
    ? 1
    : needsClaim && !twitterHandle
      ? 2
      : isConnected
        ? 3
        : 1;

  return (
    <Panel className="space-y-5 text-left">
      <AuthSteps step={step} skipTwitter={hasClaimedUsername} />

      {!isConnected ? (
        <div className="space-y-4 py-1 text-center">
          <p className="text-sm leading-relaxed text-graphite">
            Connect your wallet, then connect Twitter. Your X handle becomes
            your Hushh username after you sign.
          </p>
          <ConnectButton label="Connect wallet" />
        </div>
      ) : (
        <NetworkGate>
          {lookingUp ? (
            <div className="flex justify-center py-8">
              <LoaderIcon className="h-6 w-6 animate-spin text-graphite" />
            </div>
          ) : (
            <>
              <div className="rounded-xl bg-paper/80 px-4 py-3">
                <p className="text-xs text-graphite">Wallet connected</p>
                <p className="mt-0.5 truncate font-mono text-xs text-ink" title={address}>
                  {shortAddr(address)}
                </p>
              </div>

              {needsClaim ? (
                <>
                  {!twitterHandle ? (
                    <>
                      <div className="flex items-start gap-3 rounded-xl border border-amber/40 bg-amber/10 px-4 py-3">
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber"
                          aria-hidden
                        />
                        <p className="text-sm text-graphite">
                          Connect Twitter. Your X handle becomes your claimed
                          @username on Hushh.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={!privyReady || busy}
                        onClick={() => login()}
                        className="btn-primary"
                      >
                        {!privyReady ? (
                          <LoaderIcon className="h-5 w-5 animate-spin" />
                        ) : (
                          <XBrandIcon className="h-5 w-5" />
                        )}
                        Connect with Twitter
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="rounded-2xl border border-fog bg-white px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-paper">
                            <XBrandIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-graphite">
                              Claiming as
                            </p>
                            <p className="mt-0.5 text-2xl font-bold tracking-tight text-ink">
                              @{twitterHandle}
                            </p>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-graphite">
                        Sign with your wallet to claim @{twitterHandle} on this
                        address. Signature is saved for next time.
                      </p>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => signInOrRegister("register")}
                        className="btn-primary"
                      >
                        {busy ? (
                          <LoaderIcon className="h-5 w-5 animate-spin" />
                        ) : null}
                        {busy
                          ? "Confirm in wallet…"
                          : `Sign and claim @${twitterHandle}`}
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-graphite">Account found</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight">
                      @{(user?.username || knownUsername).replace(/^@/, "")}
                    </p>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500"
                      aria-hidden
                    />
                    <p className="text-sm text-graphite">
                      {hasCachedSignature
                        ? "Finish signing in. Your saved signature will be used."
                        : "Sign a message to finish signing in. Signature is stored in local storage."}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => signInOrRegister("signin")}
                    className="btn-primary"
                  >
                    {busy ? (
                      <LoaderIcon className="h-5 w-5 animate-spin" />
                    ) : null}
                    {busy
                      ? "Signing in…"
                      : hasCachedSignature
                        ? "Continue"
                        : "Sign in"}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => signOut({silent: true, redirect: null})}
                className="w-full text-center text-sm text-graphite hover:text-ink"
              >
                Disconnect wallet
              </button>
            </>
          )}
        </NetworkGate>
      )}

      {error ? (
        <ErrorBanner title={formatErrorTitle(error)} message={error} />
      ) : null}
    </Panel>
  );
}

export function RegisterFlow() {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return (
      <Panel className="space-y-3 text-center text-sm text-graphite">
        <p>
          Set{" "}
          <span className="font-mono text-xs">NEXT_PUBLIC_PRIVY_APP_ID</span> to
          enable Twitter-based username claims.
        </p>
      </Panel>
    );
  }
  return <RegisterFlowInner />;
}
