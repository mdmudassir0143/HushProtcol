/**
 * Register an ERC-20 on BulletPool (owner only).
 *
 * Env:
 *   TOKEN_ADDRESS   — required ERC-20 address
 *   TOKEN_DECIMALS  — optional; read from token if omitted
 *   TOKEN_SYMBOL    — optional; read from token if omitted
 *   POOL_ADDRESS    — optional override
 *
 * Usage:
 *   TOKEN_ADDRESS=0x... pnpm add:token
 *   TOKEN_ADDRESS=0x... TOKEN_DECIMALS=6 pnpm add:token --network somniaTestnet
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
  if (!poolAddr) throw new Error("Set POOL_ADDRESS or deploy the pool first.");

  const metaAbi = [
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
  ] as const;
  const token = new hre.ethers.Contract(tokenAddr, metaAbi, deployer);

  let decimals: number;
  if (process.env.TOKEN_DECIMALS) {
    decimals = Number(process.env.TOKEN_DECIMALS);
  } else {
    decimals = Number(await token.decimals());
  }

  let symbol = process.env.TOKEN_SYMBOL?.trim();
  if (!symbol) {
    try {
      symbol = await token.symbol();
    } catch {
      symbol = "UNKNOWN";
    }
  }

  console.log(`Network:  ${network}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Pool:     ${poolAddr}`);
  console.log(`Token:    ${tokenAddr} (${symbol}, ${decimals} decimals)`);

  const pool = await hre.ethers.getContractAt("BulletPool", poolAddr);
  const already = await pool.isSupported(tokenAddr);
  if (already) {
    console.log("Token already enabled on pool. Nothing to do.");
    return;
  }

  const tx = await pool.addToken(tokenAddr, decimals);
  console.log(`addToken tx: ${tx.hash}`);
  await tx.wait();
  console.log("Token enabled.");

  upsertToken(deployment, {
    address: tokenAddr,
    symbol: symbol!,
    decimals,
    enabled: true,
  });
  // Keep MockUSDC pointer if this is that token
  if (
    deployment.contracts.MockUSDC?.toLowerCase() === tokenAddr.toLowerCase() ||
    symbol === "USDC"
  ) {
    deployment.contracts.MockUSDC = tokenAddr;
  }

  const file = saveDeployment(deployment);
  console.log(`Wrote ${file}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
