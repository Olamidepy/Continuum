import { ethers } from "hardhat";

async function main() {
  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  console.log(`Current Gas Price: ${ethers.formatUnits(gasPrice || 0, "gwei")} Gwei`);
  
  // Estimate gas for a simple transaction
  const estimatedGas = 500000n; // Safe upper bound for createVault
  const estimatedCost = (gasPrice || 0n) * estimatedGas;
  
  console.log(`Estimated Max Tx Cost: ${ethers.formatEther(estimatedCost)} CELO`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
