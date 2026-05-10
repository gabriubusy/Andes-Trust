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

  it("anchorBatch ancla múltiples registros y emite eventos", async () => {
    const ids = [ethers.id("a"), ethers.id("b"), ethers.id("c")];
    const hashes = [ethers.id("ha"), ethers.id("hb"), ethers.id("hc")];
    const types = [EntityType.Animal, EntityType.Vaccination, EntityType.Weighing];

    await expect(contract.anchorBatch(ids, hashes, types))
      .to.emit(contract, "Anchored");

    expect(await contract.totalAnchored()).to.equal(3);
    expect(await contract.verify(ids[1], hashes[1])).to.be.true;
    expect(await contract.verify(ids[2], hashes[2])).to.be.true;
  });

  it("anchorBatch falla si los arrays no coinciden", async () => {
    await expect(
      contract.anchorBatch([ethers.id("a")], [ethers.id("h"), ethers.id("h2")], [0])
    ).to.be.revertedWithCustomError(contract, "LengthMismatch");
  });

  it("anchorBatch revierte completo si un id ya estaba anclado", async () => {
    await contract.anchor(entityId, payloadHash, EntityType.Animal);
    const ids = [ethers.id("nuevo"), entityId];
    const hashes = [ethers.id("h-nuevo"), payloadHash];
    await expect(contract.anchorBatch(ids, hashes, [0, 0]))
      .to.be.revertedWithCustomError(contract, "AlreadyAnchored");
    // ningún id nuevo se almacenó (atomicidad)
    expect(await contract.verify(ids[0], hashes[0])).to.be.false;
  });
});

// Helper de chai para ignorar el valor exacto de un argumento
function anyValue() { return true; }
