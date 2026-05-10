import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Desplegando con:", deployer.address);

  const anchorAddress = process.env.NEXT_PUBLIC_ANCHOR_CONTRACT;
  if (!anchorAddress) throw new Error("NEXT_PUBLIC_ANCHOR_CONTRACT no está seteado en .env.local");

  // 1. MockUSDC (solo testnet)
  const USDC = await ethers.getContractFactory("MockUSDC");
  const token = await USDC.deploy();
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  console.log("MockUSDC desplegado en:", tokenAddr);

  // 2. PaymentEscrow apuntando al TraceabilityAnchor existente
  const Escrow = await ethers.getContractFactory("PaymentEscrow");
  const escrow = await Escrow.deploy(anchorAddress);
  await escrow.waitForDeployment();
  const escrowAddr = await escrow.getAddress();
  console.log("PaymentEscrow desplegado en:", escrowAddr);

  console.log("\n👉 Añade a .env.local:");
  console.log("   NEXT_PUBLIC_MOCK_USDC=" + tokenAddr);
  console.log("   NEXT_PUBLIC_PAYMENT_ESCROW=" + escrowAddr);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
