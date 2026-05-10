import { expect } from "chai";
import { ethers } from "hardhat";
import { TraceabilityAnchor } from "../../typechain-types";

describe("TraceabilityAnchor", () => {
  let contract: TraceabilityAnchor;
  let owner: Awaited<ReturnType<typeof ethers.getSigner>>;
  let other: Awaited<ReturnType<typeof ethers.getSigner>>;

  const entityId   = ethers.id("animal-uuid-001"); // bytes32
  const payloadHash = ethers.id("json-hash-001");
  const EntityType = { Animal: 0, Vaccination: 1, Weighing: 2, Certification: 3 };

  beforeEach(async () => {
    [owner, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("TraceabilityAnchor");
    contract = await Factory.deploy();
  });

  it("el owner queda seteado correctamente", async () => {
    expect(await contract.owner()).to.equal(owner.address);
  });

  it("ancla un registro y emite el evento", async () => {
    await expect(contract.anchor(entityId, payloadHash, EntityType.Animal))
      .to.emit(contract, "Anchored")
      .withArgs(entityId, payloadHash, EntityType.Animal, owner.address, anyValue);
  });

  it("getRecord devuelve el registro anclado", async () => {
    await contract.anchor(entityId, payloadHash, EntityType.Vaccination);
    const rec = await contract.getRecord(entityId);
    expect(rec.payloadHash).to.equal(payloadHash);
    expect(rec.entityType).to.equal(EntityType.Vaccination);
    expect(rec.anchoredBy).to.equal(owner.address);
  });

  it("verify devuelve true si el hash coincide", async () => {
    await contract.anchor(entityId, payloadHash, EntityType.Animal);
    expect(await contract.verify(entityId, payloadHash)).to.be.true;
  });

  it("verify devuelve false si el hash no coincide (datos alterados)", async () => {
    await contract.anchor(entityId, payloadHash, EntityType.Animal);
    const fakeHash = ethers.id("datos-falsificados");
    expect(await contract.verify(entityId, fakeHash)).to.be.false;
  });

  it("no permite anclar el mismo entityId dos veces", async () => {
    await contract.anchor(entityId, payloadHash, EntityType.Animal);
    await expect(
      contract.anchor(entityId, payloadHash, EntityType.Animal)
    ).to.be.revertedWithCustomError(contract, "AlreadyAnchored");
  });

  it("no permite payloadHash vacío", async () => {
    await expect(
      contract.anchor(entityId, ethers.ZeroHash, EntityType.Animal)
    ).to.be.revertedWithCustomError(contract, "InvalidPayloadHash");
  });

  it("solo el owner puede anclar", async () => {
    await expect(
      contract.connect(other).anchor(entityId, payloadHash, EntityType.Animal)
    ).to.be.revertedWithCustomError(contract, "NotOwner");
  });

  it("totalAnchored cuenta correctamente", async () => {
    expect(await contract.totalAnchored()).to.equal(0);
    await contract.anchor(entityId, payloadHash, EntityType.Animal);
    expect(await contract.totalAnchored()).to.equal(1);
    await contract.anchor(ethers.id("otro-uuid"), ethers.id("otro-hash"), EntityType.Certification);
    expect(await contract.totalAnchored()).to.equal(2);
  });
});

// Helper de chai para ignorar el valor exacto de un argumento
function anyValue() { return true; }
