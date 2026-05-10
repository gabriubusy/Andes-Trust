import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { PaymentEscrow, MockUSDC, TraceabilityAnchor } from "../../typechain-types";

describe("PaymentEscrow", () => {
  let escrow: PaymentEscrow;
  let token: MockUSDC;
  let anchor: TraceabilityAnchor;
  let owner: Awaited<ReturnType<typeof ethers.getSigner>>;
  let buyer: Awaited<ReturnType<typeof ethers.getSigner>>;
  let seller: Awaited<ReturnType<typeof ethers.getSigner>>;
  let outsider: Awaited<ReturnType<typeof ethers.getSigner>>;

  const saleId = ethers.id("sale-uuid-001");
  const conditionsHash = ethers.id("conditions-payload-001");
  const amount = 1_000_000_000n; // 1000 mUSDC (6 decimals)

  beforeEach(async () => {
    [owner, buyer, seller, outsider] = await ethers.getSigners();

    const Anchor = await ethers.getContractFactory("TraceabilityAnchor");
    anchor = await Anchor.deploy();

    const USDC = await ethers.getContractFactory("MockUSDC");
    token = await USDC.deploy();

    const Escrow = await ethers.getContractFactory("PaymentEscrow");
    escrow = await Escrow.deploy(await anchor.getAddress());

    await token.mint(buyer.address, amount * 2n);
    await token.connect(buyer).approve(await escrow.getAddress(), amount * 2n);
  });

  async function createDefault() {
    const deadline = (await time.latest()) + 3600;
    await escrow.createEscrow(
      saleId,
      buyer.address,
      seller.address,
      await token.getAddress(),
      amount,
      conditionsHash,
      deadline,
    );
    return deadline;
  }

  it("happy path: create → fund → anchor → release transfiere al vendedor", async () => {
    await createDefault();
    await escrow.connect(buyer).fundEscrow(saleId);

    expect(await token.balanceOf(await escrow.getAddress())).to.equal(amount);

    // Anclar payload sanitario en TraceabilityAnchor para esta venta
    await anchor.anchor(saleId, conditionsHash, 4 /* Sale */);

    await expect(escrow.connect(owner).release(saleId, conditionsHash))
      .to.emit(escrow, "EscrowReleased")
      .withArgs(saleId, seller.address, amount, conditionsHash);

    expect(await token.balanceOf(seller.address)).to.equal(amount);
    expect(await token.balanceOf(await escrow.getAddress())).to.equal(0n);
  });

  it("release falla si el hash no fue anclado en TraceabilityAnchor", async () => {
    await createDefault();
    await escrow.connect(buyer).fundEscrow(saleId);
    await expect(escrow.connect(owner).release(saleId, conditionsHash))
      .to.be.revertedWithCustomError(escrow, "VerificationFailed");
  });

  it("release falla si el hash no coincide con conditionsHash", async () => {
    await createDefault();
    await escrow.connect(buyer).fundEscrow(saleId);
    const wrong = ethers.id("hash-equivocado");
    await anchor.anchor(saleId, wrong, 4);
    await expect(escrow.connect(owner).release(saleId, wrong))
      .to.be.revertedWithCustomError(escrow, "HashMismatch");
  });

  it("solo el comprador puede fondear", async () => {
    await createDefault();
    await expect(escrow.connect(outsider).fundEscrow(saleId))
      .to.be.revertedWithCustomError(escrow, "NotBuyer");
  });

  it("refund tras deadline devuelve fondos al comprador", async () => {
    const deadline = await createDefault();
    await escrow.connect(buyer).fundEscrow(saleId);

    await time.increaseTo(deadline + 1);

    const before = await token.balanceOf(buyer.address);
    await expect(escrow.connect(buyer).refund(saleId))
      .to.emit(escrow, "EscrowRefunded")
      .withArgs(saleId, buyer.address, amount);
    expect(await token.balanceOf(buyer.address)).to.equal(before + amount);
  });

  it("refund antes del deadline falla", async () => {
    await createDefault();
    await escrow.connect(buyer).fundEscrow(saleId);
    await expect(escrow.connect(buyer).refund(saleId))
      .to.be.revertedWithCustomError(escrow, "DeadlineNotReached");
  });

  it("no permite duplicar saleId", async () => {
    await createDefault();
    await expect(createDefault()).to.be.revertedWithCustomError(escrow, "AlreadyExists");
  });
});
