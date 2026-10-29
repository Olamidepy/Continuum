import "dotenv/config";
import path from "node:path";
import { subtask } from "hardhat/config";
import { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } from "hardhat/builtin-tasks/task-names";
import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const SOLC = "0.8.26";

// Use the compiler bundled in node_modules/solc instead of downloading one.
// Works offline and behind strict networks; the output is identical to the native build.
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args: { solcVersion: string }, _hre, runSuper) => {
  if (args.solcVersion !== SOLC) return runSuper();
  const compilerPath = path.join(__dirname, "node_modules", "solc", "soljson.js");
  return { compilerPath, isSolcJs: true, version: args.solcVersion, longVersion: `${SOLC}+commit.8a97fa7a` };
});

const key = process.env.DEPLOYER_PRIVATE_KEY;
const accounts = key ? [key.startsWith("0x") ? key : `0x${key}`] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: SOLC,
    settings: { optimizer: { enabled: true, runs: 500 }, evmVersion: "cancun" },
  },
  paths: { sources: "./src", tests: "./test", cache: "./cache", artifacts: "./artifacts" },
  networks: {
    mainnet: { url: process.env.MAINNET_RPC_URL || "", accounts, chainId: 1 },
    sepolia: { url: process.env.SEPOLIA_RPC_URL || "", accounts, chainId: 11155111 },
  },
  etherscan: { apiKey: process.env.ETHERSCAN_API_KEY || "" },
};

export default config;
