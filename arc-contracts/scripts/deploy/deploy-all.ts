/**
 * Deploy the full Bullet stack:
 *   BulletVerifier → MerkleRootManager → BulletPool → MockUSDC → addToken(+mint)
 *
 * Env (optional):
 *   RELAYER_ADDRESS  — owns MerkleRootManager (defaults to deployer)
 *   MINT_TO          — address to mint MockUSDC to (defaults to deployer)
 *   MINT_AMOUNT      — human units, e.g. "1000000" (= 1e6 USDC). Default: 1000000
 *   SKIP_TOKEN=1     — skip MockUSDC deploy + addToken
 *   SKIP_MINT=1      — deploy + addToken but do not mint
 *
 * Usage:
 *   pnpm deploy:all
 *   pnpm deploy:all --network somniaTestnet
 */
import hre from "hardhat";
import {
  loadDeployment,
  saveDeployment,
  upsertToken,
  type DeploymentFile,
} from "../lib/deployments";
import {
  chainId,
  getDeployer,
  networkName,
  optionalEnv,
  parseAddress,
} from "../lib/env";

async function main() {
  const deployer = await getDeployer();
  const network = networkName();
  const cid = await chainId();

  console.log(`Network:  ${network} (chainId ${cid})`);
  console.log(`Deployer: ${deployer.address}`);

  const relayerRaw = optionalEnv("RELAYER_ADDRESS", deployer.address)!;
  const relayer = parseAddress("RELAYER_ADDRESS", relayerRaw);

  // ── Verifier ──────────────────────────────────────────────────────────────
  console.log("\n[1/5] Deploying BulletVerifier (mock)...");
  const Verifier = await hre.ethers.getContractFactory("BulletVerifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  const verifierAddr = await verifier.getAddress();
  console.log(`  BulletVerifier:     ${verifierAddr}`);

  // ── Root manager ──────────────────────────────────────────────────────────
  console.log("\n[2/5] Deploying MerkleRootManager...");
  const RootManager = await hre.ethers.getContractFactory("MerkleRootManager");
  const rootManager = await RootManager.deploy(relayer);
  await rootManager.waitForDeployment();
  const rootManagerAddr = await rootManager.getAddress();
  console.log(`  MerkleRootManager:  ${rootManagerAddr}`);
  console.log(`  owner (relayer):    ${relayer}`);

  // ── Pool ──────────────────────────────────────────────────────────────────
  console.log("\n[3/5] Deploying BulletPool...");
  const Pool = await hre.ethers.getContractFactory("BulletPool");
  const pool = await Pool.deploy(deployer.address, verifierAddr, rootManagerAddr);
  await pool.waitForDeployment();
  const poolAddr = await pool.getAddress();
  console.log(`  BulletPool:         ${poolAddr}`);
  console.log(`  owner:              ${deployer.address}`);

  const deployment: DeploymentFile = {
    network,
    chainId: cid,
    deployer: deployer.address,
    contracts: {
      BulletVerifier: verifierAddr,
      MerkleRootManager: rootManagerAddr,
      BulletPool: poolAddr,
    },
    tokens: loadDeployment(network)?.tokens ?? [],
    updatedAt: new Date().toISOString(),
  };

  // ── MockUSDC + register ───────────────────────────────────────────────────
  if (process.env.SKIP_TOKEN === "1") {
    console.log("\n[4/5] Skipping MockUSDC (SKIP_TOKEN=1)");
    console.log("[5/5] Skipping mint");
  } else {
    console.log("\n[4/5] Deploying MockUSDC + addToken...");
    const USDC = await hre.ethers.getContractFactory("MockUSDC");
    const usdc = await USDC.deploy(deployer.address);
    await usdc.waitForDeployment();
    const usdcAddr = await usdc.getAddress();
    const decimals = Number(await usdc.decimals());
    console.log(`  MockUSDC:           ${usdcAddr} (${decimals} decimals)`);

    const addTx = await pool.addToken(usdcAddr, decimals);
    await addTx.wait();
    console.log(`  addToken:           enabled on BulletPool`);

    deployment.contracts.MockUSDC = usdcAddr;
    upsertToken(deployment, {
      address: usdcAddr,
      symbol: await usdc.symbol(),
      decimals,
      enabled: true,
    });

    if (process.env.SKIP_MINT === "1") {
      console.log("\n[5/5] Skipping mint (SKIP_MINT=1)");
    } else {
      console.log("\n[5/5] Minting MockUSDC...");
      const mintTo = parseAddress(
        "MINT_TO",
        optionalEnv("MINT_TO", deployer.address)!
      );
      const human = optionalEnv("MINT_AMOUNT", "1000000")!;
      const amount = hre.ethers.parseUnits(human, decimals);
      const mintTx = await usdc.mint(mintTo, amount);
      await mintTx.wait();
      console.log(`  minted ${human} USDC → ${mintTo}`);
    }
  }

  const file = saveDeployment(deployment);
  console.log(`\nWrote ${file}`);
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
