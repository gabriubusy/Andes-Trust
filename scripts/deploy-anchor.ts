import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Desplegando con:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance MATIC:", ethers.formatEther(balance));

  const Anchor = await ethers.getContractFactory("TraceabilityAnchor");
  const anchor = await Anchor.deploy();
  await anchor.waitForDeployment();
  const addr = await anchor.getAddress();
  console.log("TraceabilityAnchor desplegado en:", addr);

  console.log("\n👉 Actualiza .env.local:");
  console.log("   NEXT_PUBLIC_ANCHOR_CONTRACT=" + addr);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
