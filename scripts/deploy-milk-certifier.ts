import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Desplegando con:", deployer.address);

  const Certifier = await ethers.getContractFactory("MilkQualityCertifier");
  const certifier = await Certifier.deploy();
  await certifier.waitForDeployment();
  const addr = await certifier.getAddress();
  console.log("MilkQualityCertifier desplegado en:", addr);

  console.log("\n👉 Añade a .env.local:");
  console.log("   NEXT_PUBLIC_MILK_CERTIFIER=" + addr);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
