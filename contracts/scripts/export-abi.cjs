// Writes the compiled WronskianVault ABI into the website (lib/web3/vault-abi.ts).
const fs = require("node:fs");
const path = require("node:path");
const { abi } = require("../artifacts/src/WronskianVault.sol/WronskianVault.json");
const out = path.join(__dirname, "..", "..", "lib", "web3", "vault-abi.ts");
fs.writeFileSync(
  out,
  "// Generated from contracts/src/WronskianVault.sol. Regenerate after changing the contract:\n// cd contracts && npx hardhat compile && npm run abi\nexport const vaultAbi = " + JSON.stringify(abi, null, 2) + " as const;\n",
);
console.log("Wrote", out);
