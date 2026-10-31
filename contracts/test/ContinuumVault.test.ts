import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const E = (n: number | string) => ethers.parseEther(String(n));
const DAY = 24 * 60 * 60;

async function setup() {
  const [deployer, treasury, alice, bob, carol] = await ethers.getSigners();
  const token = await ethers.deployContract("MockToken");
  const vault = await ethers.deployContract("ContinuumVault", [await token.getAddress(), treasury.address]);
  for (const s of [alice, bob, carol, deployer]) {
    await token.mint(s.address, E(1_000_000));
    await token.connect(s).approve(await vault.getAddress(), ethers.MaxUint256);
  }
  return { deployer, treasury, alice, bob, carol, token, vault };
}

describe("ContinuumVault", () => {
  it("rejects zero addresses", async () => {
    const [a] = await ethers.getSigners();
    const F = await ethers.getContractFactory("ContinuumVault");
    await expect(F.deploy(ethers.ZeroAddress, a.address)).to.be.revertedWithCustomError(F, "ZeroAddress");
  });

  it("has no owner or admin functions", async () => {
    const { vault } = await setup();
    const names = vault.interface.fragments.filter((f) => f.type === "function").map((f: any) => f.name);
    for (const bad of ["owner", "transferOwnership", "setTreasury", "setToken", "pause", "upgradeTo"]) {
      expect(names).to.not.include(bad);
    }
  });

  it("locks with tier weights and unlock times", async () => {
    const { vault, alice } = await setup();
    await vault.connect(alice).lock(E(100), 3);
    const v = await vault.getVault(1);
    expect(v.owner).to.eq(alice.address);
    expect(v.amount).to.eq(E(100));
    expect(v.shares).to.eq(E(200));
    expect(v.unlockAt - v.createdAt).to.eq(30n * BigInt(DAY));
    expect(await vault.vaultsOf(alice.address)).to.deep.eq([1n]);
    await expect(vault.connect(alice).lock(E(1), 4)).to.be.revertedWithCustomError(vault, "InvalidTier");
    await expect(vault.connect(alice).lock(0, 0)).to.be.revertedWithCustomError(vault, "ZeroAmount");
  });

  it("blocks withdraw before unlock and pays full principal after", async () => {
    const { vault, token, alice } = await setup();
    await vault.connect(alice).lock(E(100), 0);
    await expect(vault.connect(alice).withdraw(1)).to.be.revertedWithCustomError(vault, "StillLocked");
    await time.increase(3 * DAY);
    const before = await token.balanceOf(alice.address);
    await vault.connect(alice).withdraw(1);
    expect((await token.balanceOf(alice.address)) - before).to.eq(E(100));
    await expect(vault.connect(alice).withdraw(1)).to.be.revertedWithCustomError(vault, "VaultClosed");
  });

  it("only the owner can act on a vault", async () => {
    const { vault, alice, bob } = await setup();
    await vault.connect(alice).lock(E(10), 0);
    await expect(vault.connect(bob).exitEarly(1)).to.be.revertedWithCustomError(vault, "NotVaultOwner");
    await expect(vault.connect(bob).claim(1)).to.be.revertedWithCustomError(vault, "NotVaultOwner");
  });

  it("splits the early-exit penalty 80/20 and pays it to remaining lockers by share", async () => {
    const { vault, token, treasury, alice, bob, carol } = await setup();
    await vault.connect(alice).lock(E(100), 0); // 100 shares
    await vault.connect(bob).lock(E(100), 3); //   200 shares
    await vault.connect(carol).lock(E(1000), 0);

    const tBefore = await token.balanceOf(treasury.address);
    const cBefore = await token.balanceOf(carol.address);
    await vault.connect(carol).exitEarly(3); // penalty 100: 80 to lockers, 20 to treasury
    expect((await token.balanceOf(treasury.address)) - tBefore).to.eq(E(20));
    expect((await token.balanceOf(carol.address)) - cBefore).to.eq(E(900));

    // 80 split by shares 100:200 → alice 26.67, bob 53.33 (rounding dust stays in the vault)
    const a = await vault.pending(1);
    const b = await vault.pending(2);
    expect(a).to.be.closeTo(E("26.666666666666666666"), 1000n);
    expect(b).to.be.closeTo(E("53.333333333333333333"), 1000n);
    expect(await vault.pending(3)).to.eq(0n);
  });

  it("the exiting saver never earns from their own penalty", async () => {
    const { vault, token, alice } = await setup();
    await vault.connect(alice).lock(E(100), 0);
    const before = await token.balanceOf(alice.address);
    await vault.connect(alice).exitEarly(1);
    expect((await token.balanceOf(alice.address)) - before).to.eq(E(90));
    expect(await vault.queuedRewards()).to.eq(E(8));
  });

  it("queues rewards when nobody is locked and releases them to the next locker", async () => {
    const { vault, alice, bob } = await setup();
    await vault.connect(bob).fund(E(50));
    expect(await vault.queuedRewards()).to.eq(E(50));
    await vault.connect(alice).lock(E(10), 0);
    expect(await vault.queuedRewards()).to.eq(0n);
    expect(await vault.pending(1)).to.be.closeTo(E(50), 1000n);
  });

  it("claim pays rewards while staying locked; withdraw pays principal + rewards", async () => {
    const { vault, token, alice, deployer } = await setup();
    await vault.connect(alice).lock(E(100), 1);
    await vault.connect(deployer).fund(E(30));
    const b0 = await token.balanceOf(alice.address);
    await vault.connect(alice).claim(1);
    expect((await token.balanceOf(alice.address)) - b0).to.be.closeTo(E(30), 1000n);
    await expect(vault.connect(alice).claim(1)).to.be.revertedWithCustomError(vault, "ZeroAmount");

    await vault.connect(deployer).fund(E(10));
    await time.increase(7 * DAY);
    const b1 = await token.balanceOf(alice.address);
    await vault.connect(alice).withdraw(1);
    expect((await token.balanceOf(alice.address)) - b1).to.be.closeTo(E(110), 1000n);
  });

  it("late lockers don't earn rewards distributed before they joined", async () => {
    const { vault, alice, bob, deployer } = await setup();
    await vault.connect(alice).lock(E(100), 0);
    await vault.connect(deployer).fund(E(100));
    await vault.connect(bob).lock(E(100), 0);
    expect(await vault.pending(2)).to.eq(0n);
    await vault.connect(deployer).fund(E(100));
    expect(await vault.pending(1)).to.be.closeTo(E(150), 1000n);
    expect(await vault.pending(2)).to.be.closeTo(E(50), 1000n);
  });

  it("topUp keeps the unlock time and re-weights shares", async () => {
    const { vault, alice } = await setup();
    await vault.connect(alice).lock(E(100), 2);
    const v0 = await vault.getVault(1);
    await time.increase(2 * DAY);
    await vault.connect(alice).topUp(1, E(50));
    const v1 = await vault.getVault(1);
    expect(v1.amount).to.eq(E(150));
    expect(v1.shares).to.eq(E(225));
    expect(v1.unlockAt).to.eq(v0.unlockAt);
  });

  it("extend restarts the lock on a same-or-longer tier and keeps earned rewards", async () => {
    const { vault, alice, deployer } = await setup();
    await vault.connect(alice).lock(E(100), 0);
    await vault.connect(deployer).fund(E(10));
    await vault.connect(alice).extend(1, 3);
    await expect(vault.connect(alice).extend(1, 2)).to.be.revertedWithCustomError(vault, "TierTooShort");
    const v = await vault.getVault(1);
    expect(v.tier).to.eq(3n);
    expect(v.shares).to.eq(E(200));
    expect(await vault.totalShares()).to.eq(E(200));
    expect(await vault.pending(1)).to.be.closeTo(E(10), 1000n);
  });

  it("stays solvent: balance always covers principal + rewards owed", async () => {
    const { vault, token, alice, bob, carol, deployer } = await setup();
    await vault.connect(alice).lock(E(123), 0);
    await vault.connect(bob).lock(E(456), 2);
    await vault.connect(carol).lock(E(789), 3);
    await vault.connect(deployer).fund(E(77));
    await vault.connect(bob).exitEarly(2);
    await vault.connect(alice).topUp(1, E(11));
    await vault.connect(carol).claim(3);
    await time.increase(31 * DAY);
    await vault.connect(alice).withdraw(1);
    await vault.connect(carol).withdraw(3);
    expect(await vault.totalLocked()).to.eq(0n);
    const dust = await token.balanceOf(await vault.getAddress());
    expect(dust).to.be.lessThan(10_000n);
  });

  it("previewExit matches exitEarly", async () => {
    const { vault, token, alice, bob, deployer } = await setup();
    await vault.connect(alice).lock(E(100), 0);
    await vault.connect(bob).lock(E(100), 0);
    await vault.connect(deployer).fund(E(20));
    const [ret, pen] = await vault.previewExit(1);
    expect(pen).to.eq(E(10));
    const b = await token.balanceOf(alice.address);
    await vault.connect(alice).exitEarly(1);
    expect((await token.balanceOf(alice.address)) - b).to.eq(ret);
  });
});
