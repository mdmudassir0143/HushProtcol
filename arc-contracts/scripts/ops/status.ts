/**
 * Print deployment addresses and on-chain token / pause status.
 *
 * Note: `hardhat` (in-memory) resets between `hardhat run` invocations, so
 * on-chain reads will fail after a prior deploy:all on that network. Use
 * `--network localhost` (with `npx hardhat node`) or a remote network for
 * live status.
 *
 * Usage:
 *   pnpm status
 *   pnpm status --network somniaTestnet
 */
import hre from "hardhat";
import {loadDeployment} from "../lib/deployments";
import {chainId, networkName} from "../lib/env";

async function main() {
  const network = networkName();
  const cid = await chainId();
  const deployment = loadDeployment(network);

  console.log(`Network: ${network} (chainId ${cid})`);
  if (!deployment) {
    console.log("No deployment file found.");
    return;
  }

  console.log(`Deployer: ${deployment.deployer}`);
  console.log(`Updated:  ${deployment.updatedAt}`);
  console.log("\nContracts:");
  for (const [name, addr] of Object.entries(deployment.contracts)) {
    console.log(`  ${name.padEnd(20)} ${addr ?? "(missing)"}`);
  }

  console.log("\nTokens (from deployment file):");
  if (deployment.tokens.length === 0) {
    console.log("  (none)");
  } else {
    for (const t of deployment.tokens) {
      console.log(
        `  ${t.symbol.padEnd(8)} ${t.address}  decimals=${t.decimals}  enabled=${t.enabled}`
      );
    }
  }

  if (!deployment.contracts.BulletPool) {
    return;
  }

  console.log("\nOn-chain:");
  try {
    const pool = await hre.ethers.getContractAt(
      "BulletPool",
      deployment.contracts.BulletPool
    );
    // Probe with a cheap view; empty bytecode → BAD_DATA on ephemeral hardhat.
    await pool.paused();

    console.log(`  paused:             ${await pool.paused()}`);
    console.log(`  depositCounter:     ${await pool.depositCounter()}`);
    console.log(`  verifier:           ${await pool.verifier()}`);
    console.log(`  rootManager:        ${await pool.rootManager()}`);

    if (deployment.contracts.MerkleRootManager) {
      const rm = await hre.ethers.getContractAt(
        "MerkleRootManager",
        deployment.contracts.MerkleRootManager
      );
      console.log(`  latestRoot:         ${await rm.latestRoot()}`);
      console.log(`  postedCount:        ${await rm.postedCount()}`);
    }

    for (const t of deployment.tokens) {
      const supported = await pool.isSupported(t.address);
      console.log(`  isSupported(${t.symbol}): ${supported}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  (unavailable — ${msg.split("\n")[0]})`);
    if (network === "hardhat" || network === "localhost") {
      console.log(
        "  Tip: in-memory Hardhat resets between runs. Use `pnpm hardhat node` + `--network localhost`, or a remote network."
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
