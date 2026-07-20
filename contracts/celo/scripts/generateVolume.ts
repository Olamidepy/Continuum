import { ethers } from "hardhat";

async function main() {
  // ==============================================================================
  // CONFIGURATION
  // ==============================================================================
  const NUM_TRANSACTIONS = 5;       // Number of random wallets to create
  const TOTAL_CELO_TO_LOCK = 0.001;  // Total CELO to lock across all wallets
  const GAS_BUFFER = 0.1;           // Extra CELO per wallet for gas fees
  
  const CONTRACT_ADDRESS = "0x162fC5502B988B60d6c82e3248Fccf57C3663188"; 
  const LOCK_DURATION = 30 * 24 * 60 * 60; // 30 days
  // ==============================================================================

  const [funder] = await ethers.getSigners();
  console.log(`╔══════════════════════════════════════════════════╗`);
  console.log(`║      ORGANIC VOLUME GENERATOR (Shuffled)         ║`);
  console.log(`╚══════════════════════════════════════════════════╝`);
  console.log(`Funder Address: ${funder.address}`);
  
  const balance = await ethers.provider.getBalance(funder.address);
  console.log(`Funder Balance: ${ethers.formatEther(balance)} CELO\n`);

  // 1. Generate random weights to shuffle the amounts organically
  let weights = [];
  let totalWeight = 0;
  for (let i = 0; i < NUM_TRANSACTIONS; i++) {
    // Random weight between 0.1 and 1.0 (some wallets lock 10x more than others)
    const weight = Math.random() * 0.9 + 0.1; 
    weights.push(weight);
    totalWeight += weight;
  }

  // 2. Calculate exact CELO lock amounts per wallet
  let amountsToLock = [];
  for (let i = 0; i < NUM_TRANSACTIONS; i++) {
    const amount = (weights[i] / totalWeight) * TOTAL_CELO_TO_LOCK;
    amountsToLock.push(amount);
  }

  const totalGasNeeded = NUM_TRANSACTIONS * GAS_BUFFER;
  const totalCeloNeeded = TOTAL_CELO_TO_LOCK + totalGasNeeded;
  
  console.log(`Target Wallets: ${NUM_TRANSACTIONS}`);
  console.log(`Total CELO to Lock: ${TOTAL_CELO_TO_LOCK} CELO`);
  console.log(`Total Gas Needed: ${totalGasNeeded} CELO`);
  console.log(`Total CELO Required: ~${totalCeloNeeded} CELO\n`);

  if (balance < ethers.parseEther(totalCeloNeeded.toString())) {
    console.error(`❌ Insufficient funds! You need at least ${totalCeloNeeded} CELO to run this.`);
    process.exit(1);
  }

  const ContinuumVaults = await ethers.getContractFactory("ContinuumVaults");

  for (let i = 0; i < NUM_TRANSACTIONS; i++) {
    console.log(`\n--- Transaction ${i + 1} of ${NUM_TRANSACTIONS} ---`);
    
    // Create random wallet
    const randomWallet = ethers.Wallet.createRandom().connect(ethers.provider);
    console.log(`👤 Wallet: ${randomWallet.address}`);

    // Convert decimal numbers to Wei safely
    const lockAmount = amountsToLock[i];
    
    // To avoid precision errors, we slice the decimal string to 18 places
    let lockAmountStr = lockAmount.toFixed(18);
    const lockAmountWei = ethers.parseEther(lockAmountStr);
    const gasBufferWei = ethers.parseEther(GAS_BUFFER.toString());
    const fundAmountWei = lockAmountWei + gasBufferWei;

    console.log(`💸 Funding wallet with ${(lockAmount + GAS_BUFFER).toFixed(4)} CELO...`);
    const fundTx = await funder.sendTransaction({
      to: randomWallet.address,
      value: fundAmountWei
    });
    await fundTx.wait();

    console.log(`🔒 Locking ${lockAmount.toFixed(4)} CELO...`);
    const contractWithRandomWallet = ContinuumVaults.attach(CONTRACT_ADDRESS).connect(randomWallet) as any;
    
    try {
      const vaultTx = await contractWithRandomWallet.createVault(
        LOCK_DURATION, 
        0, 
        0, 
        { 
          value: lockAmountWei
        }
      );
      
      const receipt = await vaultTx.wait();
      console.log(`✅ Success! Hash: https://celoscan.io/tx/${receipt.hash}`);
    } catch (err: any) {
      console.error(`❌ Failed:`, err.message);
    }
  }
  
  console.log(`\n🎉 Volume generation complete! 4 CELO randomly distributed across 25 wallets.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
