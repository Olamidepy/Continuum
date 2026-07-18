const fs = require('fs');
const path = require('path');
const { makeContractDeploy, broadcastTransaction } = require('@stacks/transactions');
const { StacksMainnet } = require('@stacks/network');

async function main() {
  // Load environment variables (if any) or read from CLI
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.error('Error: Please set DEPLOYER_PRIVATE_KEY in your environment or .env file.');
    console.log('Usage:');
    console.log('  Windows (PowerShell): $env:DEPLOYER_PRIVATE_KEY="your_private_key_hex"; node scratch/deploy.js');
    console.log('  Windows (CMD): set DEPLOYER_PRIVATE_KEY=your_private_key_hex && node scratch/deploy.js');
    process.exit(1);
  }

  const contractPath = path.join(__dirname, '..', 'contracts', 'continuum-vaults-mainnet.clar');
  console.log(`Reading contract code from: ${contractPath}`);
  
  let codeBody;
  try {
    codeBody = fs.readFileSync(contractPath, 'utf8');
  } catch (err) {
    console.error(`Error reading contract file: ${err.message}`);
    process.exit(1);
  }

  const network = new StacksMainnet();

  console.log('Preparing mainnet contract deployment transaction...');
  console.log('Contract name: continuum-vaults');

  try {
    const txOptions = {
      contractName: 'continuum-vaults',
      codeBody: codeBody,
      senderKey: privateKey,
      network: network,
      fee: 500000,
      // Stacks.js automatically estimates nonce if omitted, 
      // but we override the fee to prevent the node's high fee estimation from exceeding your wallet balance.
    };

    const transaction = await makeContractDeploy(txOptions);
    console.log('Transaction constructed successfully. Broadcasting to Stacks Mainnet...');

    const result = await broadcastTransaction(transaction, network);
    
    if (result.error) {
      console.error('Failed to broadcast transaction:', result.error);
      if (result.reason) {
        console.error('Reason:', result.reason);
      }
    } else {
      console.log('\n==================================================');
      console.log('SUCCESS! Transaction broadcasted to Mainnet.');
      console.log(`Transaction ID: 0x${result.txid}`);
      console.log(`Explorer Link:  https://explorer.stacks.co/txid/0x${result.txid}?chain=mainnet`);
      console.log('==================================================\n');
      console.log('Please wait 5-10 minutes for the next Stacks block to confirm deployment.');
    }
  } catch (err) {
    console.error('An error occurred during deployment:', err.message || err);
  }
}

main();
