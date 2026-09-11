/**
 * Pause or unpause BulletPool (owner only).
 *
 * Env:
 *   ACTION=pause|unpause  — required
 *   POOL_ADDRESS          — optional override
 *
 * Usage:
 *   ACTION=pause pnpm pool:pause
 *   ACTION=unpause pnpm pool:unpause
 */
import hre from "hardhat";
import {requireDeployment} from "../lib/deployments";
import {
  getDeployer,
  networkName,
  optionalEnv,
  parseAddress,
  requireEnv,
} from "../lib/env";

async function main() {
  const deployer = await getDeployer();
  const network = networkName();
  const deployment = requireDeployment(network);
  const action = requireEnv("ACTION").toLowerCase();
  if (action !== "pause" && action !== "unpause") {
    throw new Error('ACTION must be "pause" or "unpause"');
  }

  const poolAddr = parseAddress(
    "POOL_ADDRESS",
    optionalEnv("POOL_ADDRESS", deployment.contracts.BulletPool)!
  );

  console.log(`Network:  ${network}`);
  console.log(`Signer:   ${deployer.address}`);
  console.log(`Pool:     ${poolAddr}`);
  console.log(`Action:   ${action}`);

  const pool = await hre.ethers.getContractAt("BulletPool", poolAddr);
  const tx = action === "pause" ? await pool.pause() : await pool.unpause();
  console.log(`${action} tx: ${tx.hash}`);
  await tx.wait();
  console.log(`paused: ${await pool.paused()}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
