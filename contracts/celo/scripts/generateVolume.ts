import { ethers } from "hardhat";

async function main() {
  // ==============================================================================
  // CONFIGURATION: 32 TRANSACTIONS WITHIN $0.30 USD (~0.50 CELO TOTAL BUDGET)
  // ==============================================================================
  const NUM_TRANSACTIONS = 32;          // 32 distinct transactions
  const TOTAL_BUDGET_CELO = 0.50;       // Total budget ($0.30 USD worth of CELO @ ~$0.60/CELO)
  
  const CONTRACT_ADDRESS = "0x162fC5502B988B60d6c82e3248Fccf57C3663188"; 
  const LOCK_DURATION = 30 * 24 * 60 * 60; // 30 days time-lock
  const VAULT_GAS_LIMIT = 250000n;         // Explicit gas limit per vault call
  const FUND_GAS_LIMIT = 21000n;           // Explicit gas limit per funding transfer
  // ==============================================================================

  const [funder] = await ethers.getSigners();
  console.log(`╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║   CONTINUUM 32-VAULT BATCH EXECUTION ($0.30 BUDGET OPTIMIZED) ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝`);
  console.log(`Funder Address: ${funder.address}`);
  
  const balance = await ethers.provider.getBalance(funder.address);
  const balanceFormatted = parseFloat(ethers.formatEther(balance));
  console.log(`Funder Balance: ${balanceFormatted.toFixed(6)} CELO\n`);

  // Dynamically query network gas prices to satisfy Celo base fee requirements
  const feeData = await ethers.provider.getFeeData();
  const currentMaxFee = feeData.maxFeePerGas || ethers.parseUnits("15", "gwei");
  // Add 25% safety margin above base fee to avoid 'gas fee cap below minimum' error
  const maxFeePerGas = (currentMaxFee * 125n) / 100n;
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.parseUnits("2", "gwei");

  // Calculate dynamic gas buffer per transaction based on live network base fee
  const gasPerTxWei = (VAULT_GAS_LIMIT + FUND_GAS_LIMIT) * maxFeePerGas;
  const gasBufferPerTxWei = (gasPerTxWei * 115n) / 100n; // 15% margin on estimated gas
  const gasBufferPerTxCELO = parseFloat(ethers.formatEther(gasBufferPerTxWei));

  const TOTAL_GAS_RESERVE = gasBufferPerTxCELO * NUM_TRANSACTIONS;
  const TOTAL_CELO_TO_LOCK = Math.max(0, TOTAL_BUDGET_CELO - TOTAL_GAS_RESERVE);

  console.log(`📊 Dynamic Network Gas & Budget Breakdown:`);
  console.log(`  • Target Transactions: ${NUM_TRANSACTIONS}`);
  console.log(`  • Network Fee Cap:     ${ethers.formatUnits(maxFeePerGas, "gwei")} Gwei`);
  console.log(`  • Total Budget Cap:    ${TOTAL_BUDGET_CELO} CELO (~$0.30 USD)`);
  console.log(`  • Gas Reserve Total:   ${TOTAL_GAS_RESERVE.toFixed(5)} CELO (${gasBufferPerTxCELO.toFixed(6)} CELO per tx)`);
  console.log(`  • Net Deposit Locked:  ${TOTAL_CELO_TO_LOCK.toFixed(5)} CELO across 32 vaults\n`);

  if (balanceFormatted < TOTAL_BUDGET_CELO) {
    console.error(`❌ Insufficient balance! Wallet has ${balanceFormatted.toFixed(6)} CELO, but total budget requires ${TOTAL_BUDGET_CELO} CELO.`);
    process.exit(1);
  }

  // 1. Generate 32 distinct random weights for unique deposit amounts
  let weights: number[] = [];
  let totalWeight = 0;
  for (let i = 0; i < NUM_TRANSACTIONS; i++) {
    const weight = Math.random() * 0.8 + 0.2; // weight between 0.2 and 1.0
    weights.push(weight);
    totalWeight += weight;
  }

  // 2. Calculate exact unique CELO deposit amounts per transaction
  let amountsToLock: number[] = [];
  for (let i = 0; i < NUM_TRANSACTIONS; i++) {
    const amount = (weights[i] / totalWeight) * TOTAL_CELO_TO_LOCK;
    amountsToLock.push(amount);
  }

  const ContinuumVaults = await ethers.getContractFactory("ContinuumVaults");

  console.log(`🚀 Executing 32 Locked Vault Transactions with Dynamic Network Gas...\n`);

  for (let i = 0; i < NUM_TRANSACTIONS; i++) {
    const lockAmount = amountsToLock[i];
    console.log(`[Tx ${i + 1}/32] --- Locked Vault Transaction ---`);
    
    // Create distinct wallet for transaction execution
    const randomWallet = ethers.Wallet.createRandom().connect(ethers.provider);
    console.log(`  • Target Wallet: ${randomWallet.address}`);
    console.log(`  • Vault Deposit: ${lockAmount.toFixed(6)} CELO`);

    const lockAmountWei = ethers.parseEther(lockAmount.toFixed(18));
    const fundAmountWei = lockAmountWei + gasBufferPerTxWei;

    // 1. Fund target wallet with deposit + dynamic gas buffer
    const fundTx = await funder.sendTransaction({
      to: randomWallet.address,
      value: fundAmountWei,
      gasLimit: FUND_GAS_LIMIT,
      maxFeePerGas,
      maxPriorityFeePerGas,
    });
    await fundTx.wait();

    // 2. Call createVault on ContinuumVaults contract with dynamic network gas fees
    const contractWithWallet = ContinuumVaults.attach(CONTRACT_ADDRESS).connect(randomWallet) as any;
    
    try {
      const vaultTx = await contractWithWallet.createVault(
        LOCK_DURATION, 
        0, // Asset 0 = CELO
        0, 
        { 
          value: lockAmountWei,
          gasLimit: VAULT_GAS_LIMIT,
          maxFeePerGas,
          maxPriorityFeePerGas,
        }
      );
      
      const receipt = await vaultTx.wait();
      console.log(`  ✅ Locked Vault Created! Tx Hash: https://celoscan.io/tx/${receipt.hash}\n`);
    } catch (err: any) {
      console.error(`  ❌ Vault Creation Failed:`, err.message, `\n`);
    }
  }
  
  console.log(`🎉 All 32 Locked Vault transactions completed within $0.30 USD budget!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


