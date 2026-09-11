/**
 * Disable an ERC-20 for new deposits on BulletPool (owner only).
 * Existing pool balance remains withdrawable.
 *
 * Env:
 *   TOKEN_ADDRESS — required
 *   POOL_ADDRESS  — optional override
 *
 * Usage:
 *   TOKEN_ADDRESS=0x... pnpm remove:token
 */
import hre from "hardhat";
import {
  requireDeployment,
  saveDeployment,
  upsertToken,
} from "../lib/deployments";
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

  const tokenAddr = parseAddress("TOKEN_ADDRESS", requireEnv("TOKEN_ADDRESS"));
  const poolAddr = parseAddress(
    "POOL_ADDRESS",
    optionalEnv("POOL_ADDRESS", deployment.contracts.BulletPool)!
  );

  console.log(`Network:  ${network}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Pool:     ${poolAddr}`);
  console.log(`Token:    ${tokenAddr}`);

  const pool = await hre.ethers.getContractAt("BulletPool", poolAddr);
  const tx = await pool.removeToken(tokenAddr);
  console.log(`removeToken tx: ${tx.hash}`);
  await tx.wait();
  console.log("Token disabled for new deposits.");

  const existing = deployment.tokens.find(
    (t) => t.address.toLowerCase() === tokenAddr.toLowerCase()
  );
  upsertToken(deployment, {
    address: tokenAddr,
    symbol: existing?.symbol ?? "UNKNOWN",
    decimals: existing?.decimals ?? 0,
    enabled: false,
  });

  const file = saveDeployment(deployment);
  console.log(`Wrote ${file}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
