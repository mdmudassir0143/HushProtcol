"use client";

import {useEffect, useMemo, useState} from "react";
import {useAccount, useWriteContract} from "wagmi";
import {createPublicClient, http} from "viem";
import {bulletPoolAbi} from "@/abi/BulletPool";
import {ConnectButton} from "@/components/ConnectButton";
import {ScratchRevealCard} from "@/components/ScratchRevealCard";
import {CheckIcon, ExternalLinkIcon, LoaderIcon} from "@/components/icons";
import {ErrorBanner, Panel} from "@/components/ui";
import {claimNote} from "@/lib/api";
import {addresses, arcTestnet, explorerTx} from "@/lib/config";
import {formatError} from "@/lib/errors";
import {getToken} from "@/lib/session";
import {decodeScratchClaimPayload} from "@/lib/scratchGift";
import {claimStepLabel, prepareWithdraw, type ClaimStep} from "@/lib/withdraw";

export function ClaimView({encoded}: {encoded: string}) {
  const {address, isConnected} = useAccount();
  const {writeContractAsync} = useWriteContract();
  const payload = useMemo(() => decodeScratchClaimPayload(encoded), [encoded]);
  const [armed, setArmed] = useState(false);
  const [claimStep, setClaimStep] = useState<ClaimStep>("idle");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!armed || !payload || !isConnected || !address || done) return;
    const claimPayload = payload;
    const recipient = address as `0x${string}`;
    let cancelled = false;

    async function runClaim() {
      setError("");
      try {
        const args = await prepareWithdraw({
          payload: claimPayload.note,
          recipient,
          onStep: (step) => {
            if (!cancelled) setClaimStep(step);
          },
        });

        const {pool} = addresses();
        const hash = await writeContractAsync({
          address: pool,
          abi: bulletPoolAbi,
          functionName: "withdraw",
          args: [
            args.proof,
            args.root,
            args.nullifier,
            args.recipientDigest,
            args.recipient,
            args.token,
            args.amount,
          ],
          chainId: arcTestnet.id,
        });

        const client = createPublicClient({
          chain: arcTestnet,
          transport: http(),
        });
        await client.waitForTransactionReceipt({hash});
        if (cancelled) return;

        setTxHash(hash);
        setClaimStep("marking");

        const token = getToken();
        if (token && claimPayload.noteId) {
          await claimNote(token, claimPayload.noteId, hash).catch(() => undefined);
        }

        if (!cancelled) {
          setClaimStep("done");
          setDone(true);
        }
      } catch (e) {
        if (cancelled) return;
        setClaimStep("error");
        setError(formatError(e));
      }
    }

    void runClaim();
    return () => {
      cancelled = true;
    };
  }, [armed, payload, isConnected, address, done, writeContractAsync]);

  if (!encoded || !payload) {
    return (
      <Panel className="space-y-3 text-left">
        <p className="text-sm font-medium text-ink">This claim link is invalid.</p>
        <p className="text-sm leading-relaxed text-graphite">
          Ask the sender for a fresh scratch card link.
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <Panel className="space-y-4 !p-4 sm:!p-5">
        <div className="space-y-2 text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-graphite">
            Lottery ticket
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {done ? "You won" : "Scratch to claim"}
          </h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-graphite">
            {done
              ? "Funds are in your wallet. Keep the revealed card as your receipt."
              : "Scratch the silver panel. Once revealed, your wallet proves and withdraws on Arc."}
          </p>
        </div>

        <ScratchRevealCard
          meta={payload.meta}
          amountLabel={payload.amountLabel}
          tokenSymbol={payload.tokenSymbol}
          recipientLabel={
            payload.recipientUsername
              ? `@${payload.recipientUsername}`
              : undefined
          }
          disabled={done}
          revealed={done}
          stage
          tilt={done}
          onThreshold={() => setArmed(true)}
        />

        {error ? <ErrorBanner message={error} /> : null}

        {!armed ? (
          <div className="rounded-2xl border border-fog bg-paper/70 px-4 py-3 text-sm text-graphite">
            Scratch at least a third of the foil to start the claim.
          </div>
        ) : !isConnected ? (
          <div className="space-y-3 rounded-2xl border border-fog bg-paper/70 px-4 py-4 text-center">
            <p className="text-sm text-graphite">
              Prize revealed. Connect the recipient wallet to prove and withdraw.
            </p>
            <ConnectButton
              label="Connect wallet to claim"
              className="btn-primary"
            />
          </div>
        ) : done ? (
          <div className="space-y-3 rounded-2xl border border-signal/20 bg-signal/5 px-4 py-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-signal/10 text-signal">
              <CheckIcon className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-ink">
              Scratch card claimed
            </p>
            <p className="text-sm text-graphite">
              {payload.amountLabel} {payload.tokenSymbol} withdrawn privately.
            </p>
            {txHash ? (
              <a
                href={explorerTx(txHash)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper"
              >
                View claim transaction
                <ExternalLinkIcon className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-2xl bg-paper px-4 py-3.5">
            <LoaderIcon className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-ink" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">
                {claimStepLabel(claimStep)}
              </p>
              <p className="mt-1 text-xs text-graphite">
                Building the proof and submitting withdraw — keep this page open.
              </p>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
