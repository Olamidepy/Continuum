const { generateWallet } = require('@stacks/wallet-sdk');

async function main() {
  const mnemonic = process.argv.slice(2).join(' ');
  if (!mnemonic) {
    console.error('Error: Please provide your 12 or 24-word seed phrase as an argument.');
    console.log('Usage: node scratch/derive-key.js "word1 word2 ... word24"');
    process.exit(1);
  }

  try {
    console.log('Deriving Stacks accounts from seed phrase...');
    const wallet = await generateWallet({
      secretKey: mnemonic.trim(),
      password: '',
    });
    
    const account = wallet.accounts[0];
    console.log('\n==================================================');
    console.log('STX Address (Mainnet):', account.address);
    console.log('STX Private Key (Hex):', account.stxPrivateKey);
    console.log('==================================================\n');
  } catch (err) {
    console.error('Failed to derive key:', err.message);
  }
}

main();
