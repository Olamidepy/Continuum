import { ethers, network, run } from "hardhat";

/**
 * Deploys WronskianVault for WRON after the launch.
 * Run only AFTER the launch is finalized and the token address is public.
 *
 *   WRON_TOKEN_ADDRESS=0x... npm run deploy
 */
async function main() {
  const token = process.env.WRON_TOKEN_ADDRESS;
  if (!token || !ethers.isAddress(token)) throw new Error("Set WRON_TOKEN_ADDRESS to the launched token address");

  const code = await ethers.provider.getCode(token);
  if (code === "0x") throw new Error(`No contract at ${token} on ${network.name}`);

  const [deployer] = await ethers.getSigners();
  console.log(`Network   ${network.name} (${network.config.chainId})`);
  console.log(`Deployer  ${deployer.address}`);
  console.log(`Token     ${token}`);

  const vault = await ethers.deployContract("WronskianVault", [token]);
  await vault.waitForDeployment();
  const address = await vault.getAddress();
  console.log(`\nWronskianVault deployed: ${address}`);
  console.log(`Set NEXT_PUBLIC_WRON_VAULT_ADDRESS=${address} in Vercel and redeploy the site.`);

  if (process.env.ETHERSCAN_API_KEY && network.name !== "hardhat") {
    console.log("Waiting for 5 confirmations before verifying…");
    await vault.deploymentTransaction()?.wait(5);
    await run("verify:verify", { address, constructorArguments: [token] });
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
