import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║     Continuum Vaults — Celo Mainnet Deployment   ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log("");
  console.log("Deployer address:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "CELO");
  console.log("");

  // Celo Mainnet cUSD contract address
  const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a";

  console.log("Deploying ContinuumVaults...");
  const ContinuumVaults = await ethers.getContractFactory("ContinuumVaults");
  const contract = await ContinuumVaults.deploy(CUSD_ADDRESS);
  
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("");
  console.log("✅ ContinuumVaults deployed successfully!");
  console.log("   Contract address:", contractAddress);
  console.log("   cUSD token:     ", CUSD_ADDRESS);
  console.log("   Treasury:       ", deployer.address);
  console.log("");
  console.log("View on CeloScan: https://celoscan.io/address/" + contractAddress);
  console.log("");
  console.log("─────────────────────────────────────────────────");
  console.log("IMPORTANT: Save this contract address!");
  console.log("Update your frontend hooks/useCelo.ts with it.");
  console.log("─────────────────────────────────────────────────");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
