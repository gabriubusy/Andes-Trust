import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Desplegando con la cuenta:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "MATIC"
  );

  const TraceabilityAnchor = await ethers.getContractFactory("TraceabilityAnchor");
  const contract = await TraceabilityAnchor.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("\n✅ TraceabilityAnchor desplegado en:", address);
  console.log("   Red:", (await ethers.provider.getNetwork()).name);
  console.log("\n👉 Añade esta variable a tu .env.local:");
  console.log("   NEXT_PUBLIC_ANCHOR_CONTRACT=" + address);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
