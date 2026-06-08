import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DEPLOYER_PRIVATE_KEY =
  process.env.RELAYER_PRIVATE_KEY ?? process.env.DEPLOYER_PRIVATE_KEY ?? "";
const AMOY_RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc-amoy.polygon.technology";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    // Red local para tests rápidos
    hardhat: {},
    // Polygon Amoy testnet (gratuita, tokens de prueba)
    amoy: {
      url: AMOY_RPC_URL,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      chainId: 80002,
    },
  },
  paths: {
    sources:   "./contracts",
    tests:     "./test/contracts",
    cache:     "./cache-hardhat",
    artifacts: "./artifacts",
  },
};

export default config;
