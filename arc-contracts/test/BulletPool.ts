import {loadFixture} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import {expect} from "chai";
import hre from "hardhat";
import type {HardhatEthersSigner} from "@nomicfoundation/hardhat-ethers/signers";

const ONE = 1_000_000n;
const TEN = 10n * ONE;
const DIGEST = hre.ethers.id("recipient-digest-1");

describe("Bullet protocol", function () {
  async function deployFixture() {
    const [owner, alice, bob, relayer] = await hre.ethers.getSigners();

    const verifier = await (await hre.ethers.getContractFactory("BulletVerifier")).deploy();
    const rootManager = await (
      await hre.ethers.getContractFactory("MerkleRootManager")
    ).deploy(relayer.address);
    const pool = await (
      await hre.ethers.getContractFactory("BulletPool")
    ).deploy(owner.address, await verifier.getAddress(), await rootManager.getAddress());

    const usdc = await (await hre.ethers.getContractFactory("MockUSDC")).deploy(owner.address);
    await usdc.mint(alice.address, 1_000n * ONE);
    await usdc.mint(bob.address, 1_000n * ONE);
    await pool.addToken(await usdc.getAddress(), 6);

    return {owner, alice, bob, relayer, verifier, rootManager, pool, usdc};
  }

  async function depositAndPostRoot(
    pool: Awaited<ReturnType<typeof deployFixture>>["pool"],
    usdc: Awaited<ReturnType<typeof deployFixture>>["usdc"],
    rootManager: Awaited<ReturnType<typeof deployFixture>>["rootManager"],
    depositor: HardhatEthersSigner,
    relayer: HardhatEthersSigner,
    amount: bigint,
    commitment: string
  ) {
    await usdc.connect(depositor).approve(await pool.getAddress(), amount);
    await pool.connect(depositor).deposit(await usdc.getAddress(), amount, commitment);
    const root = hre.ethers.keccak256(
      hre.ethers.solidityPacked(["bytes32", "uint256"], [commitment, amount])
    );
    await rootManager.connect(relayer).postRoot(root);
    return root;
  }

  describe("MerkleRootManager", function () {
    it("posts roots and reports latest / known", async function () {
      const {rootManager, relayer} = await loadFixture(deployFixture);
      const root = hre.ethers.id("root-1");
      await expect(rootManager.connect(relayer).postRoot(root))
        .to.emit(rootManager, "RootPosted")
        .withArgs(root, 0, 1n);
      expect(await rootManager.isKnownRoot(root)).to.equal(true);
      expect(await rootManager.latestRoot()).to.equal(root);
    });

    it("rejects zero root, duplicate, and non-owner", async function () {
      const {rootManager, relayer, alice} = await loadFixture(deployFixture);
      const root = hre.ethers.id("root-1");
      await expect(rootManager.connect(relayer).postRoot(hre.ethers.ZeroHash)).to.be
        .revertedWithCustomError(rootManager, "ZeroRoot");
      await rootManager.connect(relayer).postRoot(root);
      await expect(rootManager.connect(relayer).postRoot(root)).to.be.revertedWithCustomError(
        rootManager,
        "RootAlreadyKnown"
      );
      await expect(rootManager.connect(alice).postRoot(hre.ethers.id("root-2"))).to.be
        .revertedWithCustomError(rootManager, "OwnableUnauthorizedAccount");
    });

    it("evicts the oldest root after 64 posts", async function () {
      const {rootManager, relayer} = await loadFixture(deployFixture);
      const first = hre.ethers.id("root-0");
      await rootManager.connect(relayer).postRoot(first);
      for (let i = 1; i < 64; i++) {
        await rootManager.connect(relayer).postRoot(hre.ethers.id(`root-${i}`));
      }
      const overflow = hre.ethers.id("root-64");
      await rootManager.connect(relayer).postRoot(overflow);
      expect(await rootManager.isKnownRoot(first)).to.equal(false);
      expect(await rootManager.latestRoot()).to.equal(overflow);
    });
  });

  describe("Token registry", function () {
    it("adds and removes tokens; only owner", async function () {
      const {pool, owner, alice, usdc} = await loadFixture(deployFixture);
      const token = await usdc.getAddress();
      expect(await pool.isSupported(token)).to.equal(true);
      await pool.connect(owner).removeToken(token);
      expect(await pool.isSupported(token)).to.equal(false);
      await pool.connect(owner).addToken(token, 6);
      expect(await pool.isSupported(token)).to.equal(true);
      await expect(pool.connect(alice).addToken(token, 6)).to.be.revertedWithCustomError(
        pool,
        "OwnableUnauthorizedAccount"
      );
    });

    it("tokenHashOf matches uint160 cast", async function () {
      const {pool, usdc} = await loadFixture(deployFixture);
      const token = await usdc.getAddress();
      expect(await pool.tokenHashOf(token)).to.equal(BigInt(token));
    });
  });

  describe("Deposit", function () {
    it("pulls tokens and emits Deposit with leaf index", async function () {
      const {pool, usdc, alice} = await loadFixture(deployFixture);
      const token = await usdc.getAddress();
      const commitment = hre.ethers.id("note-1");
      await usdc.connect(alice).approve(await pool.getAddress(), TEN);
      await expect(pool.connect(alice).deposit(token, TEN, commitment))
        .to.emit(pool, "Deposit")
        .withArgs(commitment, 0, token, TEN);
      expect(await pool.depositCounter()).to.equal(1);
    });

    it("reverts on bad token, bad amount, zero commitment", async function () {
      const {pool, usdc, alice} = await loadFixture(deployFixture);
      const token = await usdc.getAddress();
      await usdc.connect(alice).approve(await pool.getAddress(), TEN);
      await expect(
        pool.connect(alice).deposit(alice.address, TEN, hre.ethers.id("c"))
      ).to.be.revertedWithCustomError(pool, "InvalidToken");
      await expect(
        pool.connect(alice).deposit(token, 0, hre.ethers.id("c"))
      ).to.be.revertedWithCustomError(pool, "InvalidAmount");
      await expect(
        pool.connect(alice).deposit(token, TEN, hre.ethers.ZeroHash)
      ).to.be.revertedWithCustomError(pool, "InvalidCommitment");
    });
  });

  describe("Withdraw", function () {
    it("pays recipient, marks nullifier, emits Withdrawal", async function () {
      const {pool, usdc, alice, bob, relayer, rootManager} = await loadFixture(deployFixture);
      const root = await depositAndPostRoot(
        pool,
        usdc,
        rootManager,
        alice,
        relayer,
        TEN,
        hre.ethers.id("note-1")
      );
      const nullifier = hre.ethers.id("null-1");
      const token = await usdc.getAddress();
      const before = await usdc.balanceOf(bob.address);

      await expect(
        pool
          .connect(alice)
          .withdraw("0x", root, nullifier, DIGEST, bob.address, token, TEN)
      )
        .to.emit(pool, "Withdrawal")
        .withArgs(nullifier, bob.address);

      expect(await pool.nullifierSpent(nullifier)).to.equal(true);
      expect(await usdc.balanceOf(bob.address)).to.equal(before + TEN);
    });

    it("reverts on spent nullifier", async function () {
      const {pool, usdc, alice, bob, relayer, rootManager} = await loadFixture(deployFixture);
      const root = await depositAndPostRoot(
        pool,
        usdc,
        rootManager,
        alice,
        relayer,
        TEN,
        hre.ethers.id("note-1")
      );
      const nullifier = hre.ethers.id("null-1");
      const token = await usdc.getAddress();
      await pool
        .connect(alice)
        .withdraw("0x", root, nullifier, DIGEST, bob.address, token, TEN);
      await expect(
        pool
          .connect(alice)
          .withdraw("0x", root, nullifier, DIGEST, bob.address, token, TEN)
      ).to.be.revertedWithCustomError(pool, "NullifierAlreadyUsed");
    });

    it("reverts on unknown root", async function () {
      const {pool, usdc, alice, bob} = await loadFixture(deployFixture);
      const token = await usdc.getAddress();
      await usdc.connect(alice).approve(await pool.getAddress(), TEN);
      await pool.connect(alice).deposit(token, TEN, hre.ethers.id("note-1"));
      await expect(
        pool
          .connect(alice)
          .withdraw(
            "0x",
            hre.ethers.id("unknown-root"),
            hre.ethers.id("null-1"),
            DIGEST,
            bob.address,
            token,
            TEN
          )
      ).to.be.revertedWithCustomError(pool, "RootNotFound");
    });

    it("reverts when proof fails", async function () {
      const {pool, usdc, alice, bob, relayer, rootManager, owner} =
        await loadFixture(deployFixture);
      const root = await depositAndPostRoot(
        pool,
        usdc,
        rootManager,
        alice,
        relayer,
        TEN,
        hre.ethers.id("note-1")
      );
      const rejecting = await (
        await hre.ethers.getContractFactory("RejectingVerifier")
      ).deploy();
      await pool.connect(owner).setVerifier(await rejecting.getAddress());
      await expect(
        pool
          .connect(alice)
          .withdraw(
            "0x",
            root,
            hre.ethers.id("null-1"),
            DIGEST,
            bob.address,
            await usdc.getAddress(),
            TEN
          )
      ).to.be.revertedWithCustomError(pool, "InvalidProof");
    });

    it("reverts on bad args", async function () {
      const {pool, usdc, alice, relayer, rootManager} = await loadFixture(deployFixture);
      const root = await depositAndPostRoot(
        pool,
        usdc,
        rootManager,
        alice,
        relayer,
        TEN,
        hre.ethers.id("note-1")
      );
      const token = await usdc.getAddress();
      const nullifier = hre.ethers.id("null-1");

      await expect(
        pool
          .connect(alice)
          .withdraw("0x", root, nullifier, DIGEST, hre.ethers.ZeroAddress, token, TEN)
      ).to.be.revertedWithCustomError(pool, "InvalidRecipient");
      await expect(
        pool.connect(alice).withdraw("0x", root, nullifier, DIGEST, alice.address, token, 0)
      ).to.be.revertedWithCustomError(pool, "InvalidAmount");
      await expect(
        pool
          .connect(alice)
          .withdraw("0x", root, hre.ethers.ZeroHash, DIGEST, alice.address, token, TEN)
      ).to.be.revertedWithCustomError(pool, "InvalidProof");
      await expect(
        pool
          .connect(alice)
          .withdraw("0x", root, nullifier, hre.ethers.ZeroHash, alice.address, token, TEN)
      ).to.be.revertedWithCustomError(pool, "InvalidProof");
    });
  });

  describe("Pause and admin", function () {
    it("blocks deposit and withdraw while paused", async function () {
      const {pool, usdc, alice, bob, relayer, rootManager, owner} =
        await loadFixture(deployFixture);
      const token = await usdc.getAddress();
      const root = await depositAndPostRoot(
        pool,
        usdc,
        rootManager,
        alice,
        relayer,
        TEN,
        hre.ethers.id("note-1")
      );
      await pool.connect(owner).pause();
      await usdc.connect(alice).approve(await pool.getAddress(), ONE);
      await expect(
        pool.connect(alice).deposit(token, ONE, hre.ethers.id("note-2"))
      ).to.be.revertedWithCustomError(pool, "EnforcedPause");
      await expect(
        pool
          .connect(alice)
          .withdraw("0x", root, hre.ethers.id("null-1"), DIGEST, bob.address, token, TEN)
      ).to.be.revertedWithCustomError(pool, "EnforcedPause");
      await pool.connect(owner).unpause();
      await expect(
        pool
          .connect(alice)
          .withdraw("0x", root, hre.ethers.id("null-1"), DIGEST, bob.address, token, TEN)
      ).to.emit(pool, "Withdrawal");
    });

    it("owner can upgrade verifier and root manager", async function () {
      const {pool, owner, alice, relayer} = await loadFixture(deployFixture);
      const nextVerifier = await (
        await hre.ethers.getContractFactory("BulletVerifier")
      ).deploy();
      await expect(pool.connect(owner).setVerifier(await nextVerifier.getAddress())).to.emit(
        pool,
        "VerifierUpdated"
      );
      await expect(
        pool.connect(alice).setVerifier(await nextVerifier.getAddress())
      ).to.be.revertedWithCustomError(pool, "OwnableUnauthorizedAccount");
      const nextRoots = await (
        await hre.ethers.getContractFactory("MerkleRootManager")
      ).deploy(relayer.address);
      await expect(pool.connect(owner).setRootManager(await nextRoots.getAddress())).to.emit(
        pool,
        "RootManagerUpdated"
      );
    });
  });
});
