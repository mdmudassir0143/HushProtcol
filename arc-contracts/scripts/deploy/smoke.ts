/**
 * Single-process smoke test of deploy + token + root ops on the current network.
 * Useful for local Hardhat where state does not persist across `hardhat run`s.
 *
 * Usage:
 *   pnpm smoke
 */
import hre from "hardhat";
import {saveDeployment, upsertToken, type DeploymentFile} from "../lib/deployments";
import {chainId, getDeployer, networkName} from "../lib/env";

async function main() {
  const deployer = await getDeployer();
  const network = networkName();
  const cid = await chainId();

  console.log(`Smoke on ${network} (chainId ${cid}) as ${deployer.address}\n`);

  const verifier = await (
    await hre.ethers.getContractFactory("BulletVerifier")
  ).deploy();
  await verifier.waitForDeployment();

  const rootManager = await (
    await hre.ethers.getContractFactory("MerkleRootManager")
  ).deploy(deployer.address);
  await rootManager.waitForDeployment();

  const pool = await (
    await hre.ethers.getContractFactory("BulletPool")
  ).deploy(
    deployer.address,
    await verifier.getAddress(),
    await rootManager.getAddress()
  );
  await pool.waitForDeployment();

  const usdc = await (
    await hre.ethers.getContractFactory("MockUSDC")
  ).deploy(deployer.address);
  await usdc.waitForDeployment();

  const usdcAddr = await usdc.getAddress();
  const decimals = Number(await usdc.decimals());
  await (await pool.addToken(usdcAddr, decimals)).wait();
  await (await usdc.mint(deployer.address, hre.ethers.parseUnits("1000", decimals))).wait();

  const root =
    "0x2222222222222222222222222222222222222222222222222222222222222222";
  await (await rootManager.postRoot(root)).wait();

  await (await pool.removeToken(usdcAddr)).wait();
  if (await pool.isSupported(usdcAddr)) throw new Error("expected disabled");
  await (await pool.addToken(usdcAddr, decimals)).wait();
  if (!(await pool.isSupported(usdcAddr))) throw new Error("expected enabled");

  const deployment: DeploymentFile = {
    network,
    chainId: cid,
    deployer: deployer.address,
    contracts: {
      BulletVerifier: await verifier.getAddress(),
      MerkleRootManager: await rootManager.getAddress(),
      BulletPool: await pool.getAddress(),
      MockUSDC: usdcAddr,
    },
    tokens: [],
    updatedAt: new Date().toISOString(),
  };
  upsertToken(deployment, {
    address: usdcAddr,
    symbol: await usdc.symbol(),
    decimals,
    enabled: true,
  });
  const file = saveDeployment(deployment);

  console.log("OK");
  console.log(`  pool:     ${await pool.getAddress()}`);
  console.log(`  usdc:     ${usdcAddr}`);
  console.log(`  root:     ${await rootManager.latestRoot()}`);
  console.log(`  minted:   ${hre.ethers.formatUnits(await usdc.balanceOf(deployer.address), decimals)} USDC`);
  console.log(`  wrote:    ${file}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
