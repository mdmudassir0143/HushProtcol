"use client";

import {useAccount} from "wagmi";
import {explorerAddress, POOL_TOKENS, type PoolToken} from "@/lib/config";
import {useSession} from "@/hooks/useSession";
import {useSignOut} from "@/hooks/useSignOut";
import {toast} from "@/lib/toast";
import {ConnectButton} from "@/components/ConnectButton";
import {NetworkGate} from "@/components/NetworkGate";
import {UserAvatar} from "@/components/UserAvatar";
import {
  CopyIcon,
  CheckIcon,
  ExternalLinkIcon,
  BadgeCheckIcon,
  LogOutIcon,
  LoaderIcon,
  ArrowUpRightIcon,
  InboxIcon,
  WalletIcon,
  ShieldCheckIcon,
} from "@/components/icons";
import {Panel} from "@/components/ui";
import {
  useArcBalance,
  useTokenBalance,
} from "@/hooks/useUsdcBalance";
import {TransactionHistory} from "@/components/TransactionHistory";
import {ConnectTwitterCard} from "@/components/ConnectTwitterCard";
import {useState} from "react";
import {getAvatarByAddress} from "@/utils/getAvatarByAddress";
import {shortAddr} from "@/lib/address";

function CopyChip({
  value,
  kind,
  copied,
  onCopy,
}: {
  value: string;
  kind: "wallet" | "key";
  copied: "wallet" | "key" | null;
  onCopy: (value: string, kind: "wallet" | "key") => void;
}) {
  const done = copied === kind;
  return (
    <button
      type="button"
      onClick={() => onCopy(value, kind)}
      className="rounded-full border border-fog bg-white p-2 text-ink transition-all duration-200 hover:border-graphite active:scale-95"
      aria-label={kind === "wallet" ? "Copy wallet" : "Copy Hushh Protocol key"}
    >
      {done ? (
        <CheckIcon className="h-3.5 w-3.5 text-signal" />
      ) : (
        <CopyIcon className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

function DetailRow({
  icon,
  label,
  value,
  mono = true,
  trailing,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-fog/80 bg-paper/50 px-4 py-3.5">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-graphite ring-1 ring-fog">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-graphite">
          {label}
        </p>
        <p
          className={`mt-1 break-all text-sm leading-snug text-ink ${
            mono ? "font-mono text-xs sm:text-[13px]" : "font-semibold"
          }`}
        >
          {value}
        </p>
      </div>
      {trailing ? (
        <div className="flex shrink-0 items-center gap-1.5">{trailing}</div>
      ) : null}
    </div>
  );
}

function StatusChip({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "idle";
  children: React.ReactNode;
}) {
  const styles =
    tone === "ok"
      ? "bg-signal/10 text-signal ring-1 ring-signal/15"
      : tone === "warn"
        ? "bg-amber/15 text-ink ring-1 ring-amber/20"
        : "bg-paper/90 text-graphite ring-1 ring-fog/80";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[-0.01em] ${styles}`}
    >
      {children}
    </span>
  );
}

function TokenLogoTiny({token}: {token: PoolToken}) {
  return (
    <img
      src={token.logo}
      alt=""
      width={22}
      height={22}
      draggable={false}
      className="h-[22px] w-[22px] shrink-0 rounded-full"
    />
  );
}

function BalanceTile({
  label,
  amount,
  symbol,
  isLoading,
  isFetching,
  onRefresh,
  logo,
}: {
  label: string;
  amount: string;
  symbol: string;
  isLoading: boolean;
  isFetching: boolean;
  onRefresh: () => void;
  logo?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-fog/80 bg-white px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {logo}
          <p className="truncate text-[11px] font-medium text-graphite">
            {label}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isFetching}
          className="text-[11px] font-medium text-graphite transition-colors hover:text-ink disabled:opacity-50"
        >
          {isFetching ? "…" : "↻"}
        </button>
      </div>
      {isLoading ? (
        <div className="mt-2 flex items-center gap-2 text-sm text-graphite">
          <LoaderIcon className="h-3.5 w-3.5 animate-spin" />
          …
        </div>
      ) : (
        <p className="mt-1.5 text-xl font-bold tracking-tight tabular-nums text-ink">
          {amount}{" "}
          <span className="text-xs font-semibold text-graphite">{symbol}</span>
        </p>
      )}
    </div>
  );
}

function ProfileBalances() {
  const {isConnected} = useAccount();
  const arc = useArcBalance();
  const tokens = POOL_TOKENS.filter((t) => t.enabled);

  if (!isConnected) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-graphite">
          Balances
        </h2>
        <p className="font-mono text-[11px] text-graphite">Arc Testnet</p>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <BalanceTile
          label="Gas"
          amount={arc.formatted}
          symbol={arc.symbol}
          isLoading={arc.isLoading}
          isFetching={arc.isFetching}
          onRefresh={() => void arc.refetch()}
          logo={
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-ink text-[9px] font-bold text-paper">
              A
            </span>
          }
        />
        {tokens.map((t) => (
          <PoolBalanceTile key={t.address} token={t} />
        ))}
      </div>
    </section>
  );
}

function PoolBalanceTile({token}: {token: PoolToken}) {
  const bal = useTokenBalance(token);
  return (
    <BalanceTile
      label={token.symbol}
      amount={bal.formatted}
      symbol={token.symbol}
      isLoading={bal.isLoading}
      isFetching={bal.isFetching}
      onRefresh={() => void bal.refetch()}
      logo={<TokenLogoTiny token={token} />}
    />
  );
}

function PendingBanner({
  title,
  body,
  cta,
  href,
}: {
  title: string;
  body: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber/40 bg-amber/10 px-4 py-3.5">
      <span
        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-graphite">{body}</p>
        <a href={href} className="btn-primary mt-3 inline-flex !w-auto px-4">
          {cta}
        </a>
      </div>
    </div>
  );
}

export function AccountView() {
  const {address, isConnected} = useAccount();
  const {
    user,
    isSignedIn,
    hasProfile,
    needsUsername,
    showPendingDot,
    hasCachedSignature,
  } = useSession();
  const signOut = useSignOut();
  const [copied, setCopied] = useState<"wallet" | "key" | null>(null);

  function copy(value: string, kind: "wallet" | "key") {
    void navigator.clipboard.writeText(value);
    setCopied(kind);
    toast.success(
      kind === "wallet" ? "Wallet copied." : "Hushh Protocol key copied."
    );
    setTimeout(() => setCopied(null), 1500);
  }

  if (!isConnected) {
    return (
      <Panel className="space-y-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-paper ring-1 ring-fog">
          <WalletIcon className="h-7 w-7 text-graphite" />
        </div>
        <div>
          <p className="text-lg font-semibold tracking-tight text-ink">
            Connect to view your profile
          </p>
          <p className="mt-1.5 text-sm text-graphite">
            Your username, balances, and silent notes live with this wallet.
          </p>
        </div>
        <ConnectButton />
      </Panel>
    );
  }

  if (needsUsername || !hasProfile || !user) {
    return (
      <Panel className="space-y-5 text-left">
        <div className="flex items-center gap-4">
          <UserAvatar address={address} size="lg" />
          <div className="min-w-0">
            <StatusChip tone="warn">
              <span className="h-1.5 w-1.5 rounded-full bg-amber" />
              Incomplete
            </StatusChip>
            <p className="mt-2 truncate font-mono text-sm text-ink">
              {address ? shortAddr(address) : "—"}
            </p>
            <p className="mt-1 text-xs text-graphite">
              {getAvatarByAddress(address).name} avatar
            </p>
          </div>
        </div>

        <PendingBanner
          title={
            needsUsername
              ? "Connect Twitter to claim your username"
              : "Sign in to unlock your account"
          }
          body={
            needsUsername
              ? "Connect Twitter, then sign with this wallet. Your X handle becomes your @username."
              : "Wallet is connected. Sign a message to unlock send, inbox, and history."
          }
          cta={needsUsername ? "Connect Twitter" : "Sign in now"}
          href="/register"
        />

        <DetailRow
          icon={<WalletIcon className="h-4 w-4" />}
          label="Connected wallet"
          value={address ? shortAddr(address) : "—"}
          trailing={
            address ? (
              <CopyChip
                value={address}
                kind="wallet"
                copied={copied}
                onCopy={copy}
              />
            ) : null
          }
        />

        <ConnectButton label="Disconnect" className="btn-ghost" />
      </Panel>
    );
  }

  const avatarMeta = getAvatarByAddress(user.wallet);

  return (
    <div className="space-y-4">
      <Panel className="!p-0 overflow-hidden text-left">
        {/* Identity hero */}
        <div className="relative border-b border-fog/80 bg-[radial-gradient(120%_90%_at_0%_0%,rgba(10,10,10,0.05),transparent_55%),linear-gradient(180deg,#f6f4ef_0%,#ffffff_72%)] px-5 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-4 sm:gap-5">
              <UserAvatar
                address={user.wallet}
                size="lg"
                className="shrink-0 ring-1 ring-ink/5"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {isSignedIn ? (
                    <StatusChip tone="ok">
                      <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                      Signed in
                    </StatusChip>
                  ) : (
                    <StatusChip tone="warn">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber" />
                      Signature needed
                    </StatusChip>
                  )}
                  <StatusChip tone="idle">{avatarMeta.name}</StatusChip>
                </div>
                <div className="mt-2 flex min-w-0 items-center gap-2">
                  <h1 className="truncate text-3xl font-bold tracking-[-0.035em] text-ink sm:text-4xl">
                    @{user.username}
                  </h1>
                  <span
                    className="inline-flex shrink-0 text-signal"
                    title="Claimed username"
                    aria-label="Verified claimed username"
                  >
                    <BadgeCheckIcon className="h-6 w-6 sm:h-7 sm:w-7" />
                  </span>
                </div>
                <p className="mt-1.5 font-mono text-xs text-graphite">
                  {shortAddr(user.wallet)}
                </p>
              </div>
            </div>

            {isSignedIn ? (
              <div className="flex flex-wrap gap-2">
                <a
                  href="/send"
                  className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold tracking-[-0.01em] text-paper shadow-[0_8px_20px_-12px_rgba(10,10,10,0.45)] transition-all duration-200 hover:bg-ink/90 active:scale-[0.98]"
                >
                  <ArrowUpRightIcon className="h-4 w-4" />
                  Send
                </a>
                <a
                  href="/inbox"
                  className="inline-flex items-center gap-2 rounded-full border border-fog bg-white/90 px-4 py-2.5 text-sm font-semibold tracking-[-0.01em] text-ink backdrop-blur-sm transition-colors hover:border-graphite"
                >
                  <InboxIcon className="h-4 w-4" />
                  Inbox
                </a>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
          {showPendingDot && !isSignedIn ? (
            <PendingBanner
              title="Pending: signature required"
              body={
                hasCachedSignature
                  ? "Finish signing in — your saved signature will be used."
                  : "Sign a message to unlock send and inbox. The signature is stored locally."
              }
              cta="Sign in now"
              href="/register"
            />
          ) : null}

          <NetworkGate>
            <ProfileBalances />

            <section className="mt-6 space-y-2.5">
              <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-graphite">
                Social
              </h2>
              <ConnectTwitterCard />
            </section>

            <section className="mt-6 space-y-2.5">
              <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-graphite">
                Profile details
              </h2>
              <DetailRow
                icon={<WalletIcon className="h-4 w-4" />}
                label="Wallet"
                value={shortAddr(user.wallet)}
                trailing={
                  <>
                    <CopyChip
                      value={user.wallet}
                      kind="wallet"
                      copied={copied}
                      onCopy={copy}
                    />
                    <a
                      href={explorerAddress(user.wallet)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-fog bg-white p-2 text-ink transition-colors hover:border-graphite"
                      aria-label="View on explorer"
                      title="View on arcscan"
                    >
                      <ExternalLinkIcon className="h-3.5 w-3.5" />
                    </a>
                  </>
                }
              />
              <DetailRow
                icon={<ShieldCheckIcon className="h-4 w-4" />}
                label="Hushh Protocol key"
                value={shortAddr(user.bulletPublicKey)}
                trailing={
                  <CopyChip
                    value={user.bulletPublicKey}
                    kind="key"
                    copied={copied}
                    onCopy={copy}
                  />
                }
              />
            </section>
          </NetworkGate>
        </div>
      </Panel>

      {isSignedIn ? (
        <Panel className="text-left">
          <TransactionHistory />
        </Panel>
      ) : null}

      <button
        type="button"
        onClick={() => void signOut({redirect: "/"})}
        className="btn-ghost inline-flex w-full items-center justify-center gap-2"
      >
        <LogOutIcon className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );
}
