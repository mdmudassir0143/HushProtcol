/**
 * Deploy MockUSDC only and optionally register it on an existing BulletPool.
 *
 * Env:
 *   ADD_TO_POOL=1     — call BulletPool.addToken after deploy (default: 1)
 *   POOL_ADDRESS      — override pool address (else deployments/<network>.json)
 *   MINT_TO           — mint recipient (default: deployer)
 *   MINT_AMOUNT       — human units (default: 1000000)
 *   SKIP_MINT=1       — do not mint
 *
 * Usage:
 *   pnpm deploy:token
 *   pnpm deploy:token --network somniaTestnet
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
} from "../lib/env";

async function main() {
  const deployer = await getDeployer();
  const network = networkName();
  const deployment = requireDeployment(network);

  console.log(`Network:  ${network}`);
  console.log(`Deployer: ${deployer.address}`);

  console.log("\nDeploying MockUSDC...");
  const USDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = await USDC.deploy(deployer.address);
  await usdc.waitForDeployment();
  const usdcAddr = await usdc.getAddress();
  const decimals = Number(await usdc.decimals());
  const symbol = await usdc.symbol();
  console.log(`  MockUSDC: ${usdcAddr} (${symbol}, ${decimals} decimals)`);

  deployment.contracts.MockUSDC = usdcAddr;

  const addToPool = optionalEnv("ADD_TO_POOL", "1") === "1";
  if (addToPool) {
    const poolAddr = parseAddress(
      "POOL_ADDRESS",
      optionalEnv("POOL_ADDRESS", deployment.contracts.BulletPool)!
    );
    if (!deployment.contracts.BulletPool && !process.env.POOL_ADDRESS) {
      throw new Error("No BulletPool in deployment file. Set POOL_ADDRESS.");
    }

    const pool = await hre.ethers.getContractAt("BulletPool", poolAddr);
    console.log(`\naddToken on BulletPool ${poolAddr}...`);
    const tx = await pool.addToken(usdcAddr, decimals);
    await tx.wait();
    console.log("  token enabled");

    upsertToken(deployment, {
      address: usdcAddr,
      symbol,
      decimals,
      enabled: true,
    });
  }

  if (process.env.SKIP_MINT !== "1") {
    const mintTo = parseAddress(
      "MINT_TO",
      optionalEnv("MINT_TO", deployer.address)!
    );
    const human = optionalEnv("MINT_AMOUNT", "1000000")!;
    const amount = hre.ethers.parseUnits(human, decimals);
    console.log(`\nMinting ${human} ${symbol} → ${mintTo}...`);
    const mintTx = await usdc.mint(mintTo, amount);
    await mintTx.wait();
    console.log("  minted");
  }

  const file = saveDeployment(deployment);
  console.log(`\nWrote ${file}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
