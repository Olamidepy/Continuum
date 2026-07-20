import { ethers } from "hardhat";

async function main() {
  const signature = "createVault(uint256,uint8,uint256)";
  const hash = ethers.id(signature);
  const selector = hash.slice(0, 10);
  console.log("==========================================");
  console.log("THE TRUE SELECTOR IS:", selector);
  console.log("==========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
