import { ethers } from "hardhat";

async function main() {
  // ==============================================================================
  // CONFIGURATION: 32 NON-ZERO LOCKED VAULT TRANSACTIONS WITH REAL-TIME GAS PRICING
  // ==============================================================================
  const NUM_TRANSACTIONS = 32;               // 32 distinct transactions
  const MIN_DEPOSIT_PER_VAULT = 0.001;        // Minimum 0.001 CELO per vault (prevents 0 wei reverts)
  const BASE_DEPOSIT_BUDGET = 0.064;          // Total deposit budget distributed (~$0.04 USD)
  
  const CONTRACT_ADDRESS = "0x162fC5502B988B60d6c82e3248Fccf57C3663188"; 
  const LOCK_DURATION = 30 * 24 * 60 * 60;    // 30 days time-lock
  const VAULT_GAS_LIMIT = 250000n;            // Explicit gas limit per vault call
  const FUND_GAS_LIMIT = 21000n;              // Explicit gas limit per funding transfer
  // ==============================================================================

  const [funder] = await ethers.getSigners();
  console.log(`╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║   CONTINUUM 32-VAULT BATCH EXECUTION (NON-ZERO DEPOSITS)     ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝`);
  console.log(`Funder Address: ${funder.address}`);
  
  const balance = await ethers.provider.getBalance(funder.address);
  const balanceFormatted = parseFloat(ethers.formatEther(balance));
  console.log(`Funder Balance: ${balanceFormatted.toFixed(6)} CELO\n`);

  // Dynamically query network gas prices from Celo RPC provider
  const feeData = await ethers.provider.getFeeData();
  const currentMaxFee = feeData.maxFeePerGas || feeData.gasPrice || ethers.parseUnits("20", "gwei");
  // Add 15% safety margin above network base fee to ensure fast confirmation
  const maxFeePerGas = (currentMaxFee * 115n) / 100n;
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.parseUnits("2", "gwei");

  // Calculate dynamic gas cost per transaction pair (funding + createVault)
  const gasPerTxWei = (VAULT_GAS_LIMIT + FUND_GAS_LIMIT) * maxFeePerGas;
  const gasBufferPerTxWei = (gasPerTxWei * 110n) / 100n; // 10% safety buffer
  const gasBufferPerTxCELO = parseFloat(ethers.formatEther(gasBufferPerTxWei));

  const TOTAL_GAS_RESERVE = gasBufferPerTxCELO * NUM_TRANSACTIONS;
  const TOTAL_DEPOSIT_LOCK = BASE_DEPOSIT_BUDGET;
  const TOTAL_CELO_REQUIRED = TOTAL_GAS_RESERVE + TOTAL_DEPOSIT_LOCK;

  const gweiPriceStr = ethers.formatUnits(maxFeePerGas, "gwei");

  console.log(`📊 Live Network Gas & Fee Report:`);
  console.log(`  • Live Network Gas Price: ${parseFloat(gweiPriceStr).toFixed(2)} Gwei`);
  console.log(`  • Gas Fee Per Transaction: ${gasBufferPerTxCELO.toFixed(6)} CELO (~$${(gasBufferPerTxCELO * 0.60).toFixed(5)} USD)`);
  console.log(`  • Total 32 Tx Gas Cost:   ${TOTAL_GAS_RESERVE.toFixed(5)} CELO (~$${(TOTAL_GAS_RESERVE * 0.60).toFixed(4)} USD)`);
  console.log(`  • Total Vault Deposits:   ${TOTAL_DEPOSIT_LOCK.toFixed(5)} CELO across 32 vaults`);
  console.log(`  • Total CELO Required:    ${TOTAL_CELO_REQUIRED.toFixed(5)} CELO (~$${(TOTAL_CELO_REQUIRED * 0.60).toFixed(4)} USD)\n`);

  if (balanceFormatted < TOTAL_CELO_REQUIRED) {
    console.error(`❌ Insufficient balance! Wallet has ${balanceFormatted.toFixed(6)} CELO, but script requires ${TOTAL_CELO_REQUIRED.toFixed(5)} CELO.`);
    process.exit(1);
  }

  // 1. Generate 32 distinct random weights for unique non-zero deposit amounts
  let weights: number[] = [];
  let totalWeight = 0;
  for (let i = 0; i < NUM_TRANSACTIONS; i++) {
    const weight = Math.random() * 0.8 + 0.2; // weight between 0.2 and 1.0
    weights.push(weight);
    totalWeight += weight;
  }

  // 2. Calculate exact unique CELO deposit amounts per transaction (Guaranteed >= MIN_DEPOSIT_PER_VAULT)
  let amountsToLock: number[] = [];
  for (let i = 0; i < NUM_TRANSACTIONS; i++) {
    const calculatedAmount = (weights[i] / totalWeight) * TOTAL_DEPOSIT_LOCK;
    const finalAmount = Math.max(MIN_DEPOSIT_PER_VAULT, calculatedAmount);
    amountsToLock.push(finalAmount);
  }

  const ContinuumVaults = await ethers.getContractFactory("ContinuumVaults");

  console.log(`🚀 Executing 32 Non-Zero Locked Vault Transactions...\n`);

  for (let i = 0; i < NUM_TRANSACTIONS; i++) {
    const lockAmount = amountsToLock[i];
    console.log(`[Tx ${i + 1}/32] --- Locked Vault Transaction ---`);
    
    // Create distinct wallet for transaction execution
    const randomWallet = ethers.Wallet.createRandom().connect(ethers.provider);
    console.log(`  • Target Wallet: ${randomWallet.address}`);
    console.log(`  • Vault Deposit: ${lockAmount.toFixed(6)} CELO`);
    console.log(`  • Gas Allocation: ${gasBufferPerTxCELO.toFixed(6)} CELO`);

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
  
  console.log(`🎉 All 32 Locked Vault transactions completed successfully!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



