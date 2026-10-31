#!/usr/bin/env node
// Builds Continuum's protected Ethereum Custom Launch request with Programmable's own launch package.
// It never signs or sends a transaction. Run it twice:
//   1st run: writes the exact contract sources into ~/continuum-launch (draft). Push that folder to GitHub.
//   2nd run: binds the pushed commit and writes protected-launch.config.json, ready for submit.sh.
//
// Needs: ETH_RPC_URL (an Ethereum Mainnet RPC with no domain restriction).

import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

// ─── Continuum launch settings ────────────────────────────────
const LAUNCH = {
  launchWallet: "0x64b646C9B4ec3C03f16A47e3F4e838615EeBddD7",
  name: "Continuum",
  symbol: "CNTM",
  description:
    "Continuum is where leaving early has a price, and holding has a payout. Lock your tokens for up to 30 days. Every early exit forfeits 10%, and it flows straight to the holders who kept their word.",
  website: "https://www.continuumxyz.live/",
  x: "https://x.com/continuum_xyz",
  github: "https://github.com/Olamidepy/Continuum",
  imageUri: "https://www.continuumxyz.live/token.png",
  supply: "1000000000000000000000000000", // 1,000,000,000 tokens (18 decimals)
  creatorFeeBps: 270, // 2.7% on buys and sells, paid to the launch wallet. Programmable adds its 0.3%.
  initialBuyUsd: 4,
  additionalTaxExemptWallets: [], // up to 6 extra wallets that skip the 99% opening fee (still capped at 2%)
  sourceRepo: "https://github.com/Olamidepy/continuum-launch", // public repo holding the exact sources
};
const MIN_OUT_SAFETY = 0.8; // accept down to 80% of the expected first-buy tokens

// ─── Paths ────────────────────────────────────────────────────
const home = os.homedir();
const LAUNCH_DIR = path.resolve(process.env.LAUNCH_DIR || path.join(home, "continuum-launch"));
const PKG = path.resolve(process.env.PROGRAMMABLE_PKG || path.join(home, "programmable", "packages", "launch"));
const STATE = path.join(LAUNCH_DIR, ".launch-state.json");
const API = "https://api.programmable.market";
const ETH_USD_FEED = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"; // Chainlink ETH/USD, Ethereum Mainnet
const SOURCE_PATHS = ["src", "lib", "protection", "assets"];

const say = (...a) => console.log(...a);
const fail = (msg) => {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
};

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) fail(`${url} answered HTTP ${res.status}`);
  return res.json();
}

function git(...args) {
  try {
    return execFileSync("git", ["-C", LAUNCH_DIR, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

async function main() {
  const RPC = process.env.ETH_RPC_URL;
  if (!RPC) fail("Set ETH_RPC_URL first:  export ETH_RPC_URL='https://eth-mainnet.g.alchemy.com/v2/...'");
  if (!existsSync(path.join(PKG, "src", "launch-protection.mjs"))) fail(`Programmable's launch package not found at ${PKG}. Run setup.sh first.`);

  const require = createRequire(path.join(PKG, "package.json"));
  const { createPublicClient, http, parseAbi, formatEther } = require("viem");
  const { mainnet } = require("viem/chains");
  const { buildProtectedEthereumLaunchV1 } = await import(pathToFileURL(path.join(PKG, "src", "launch-protection.mjs")).href);

  // 1. Programmable's live rules.
  const protection = await getJson(`${API}/v1/launch-protection`);
  if (!protection.required) fail("Launch protection is not marked required right now. Stop and check with Programmable.");
  if (!protection.supportedChains?.includes("1")) fail("Launch protection doesn't list Ethereum Mainnet.");
  const capabilities = await getJson(`${API}/v3/capabilities`);
  if (capabilities.chain?.id !== "1" || capabilities.profile?.profileVersion !== "3.6.0" || capabilities.profile?.productionLaunchAuthorized !== true) {
    fail(`Programmable's live Ethereum profile is ${capabilities.profile?.profileVersion ?? "unknown"}, not 3.6.0. The launch package needs updating; send this message to Claude.`);
  }

  // 2. Chain reads.
  const client = createPublicClient({ chain: mainnet, transport: http(RPC) });
  let chainId;
  try {
    chainId = await client.getChainId();
  } catch (e) {
    const msg = String(e?.details || e?.message || e);
    if (/whitelist|allowlist|origin/i.test(msg)) {
      fail("Your Alchemy key only works from your website (domain allowlist). Create a SECOND Alchemy app with no allowlist and use its URL as ETH_RPC_URL.");
    }
    fail(`The RPC didn't answer: ${msg.split("\n")[0]}`);
  }
  if (chainId !== 1) fail("ETH_RPC_URL is not Ethereum Mainnet.");
  const [, answer] = await client.readContract({
    address: ETH_USD_FEED,
    abi: parseAbi(["function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)"]),
    functionName: "latestRoundData",
  });
  const ethUsd = Number(answer) / 1e8;
  const initialBuyWei = BigInt(Math.ceil((LAUNCH.initialBuyUsd / ethUsd) * 1e18));
  const supply = BigInt(LAUNCH.supply);
  const minFdv = Number(protection.minimumFdvUsd ?? 15000);
  const feeShare = (30 + LAUNCH.creatorFeeBps) / 10_000;
  const expected = (supply * BigInt(Math.floor((LAUNCH.initialBuyUsd / minFdv) * (1 - feeShare) * 1e12))) / 1_000_000_000_000n;
  const minimumTokensOut = (expected * BigInt(Math.round(MIN_OUT_SAFETY * 1000))) / 1000n;
  if (minimumTokensOut <= 0n) fail("Minimum first-buy output came out as zero.");

  // 3. Stable nonce (kept between runs so the predicted addresses don't change).
  await mkdir(LAUNCH_DIR, { recursive: true });
  let state = existsSync(STATE) ? JSON.parse(await readFile(STATE, "utf8")) : null;
  if (!state) {
    state = { nonce: "0x" + randomBytes(32).toString("hex"), createdAt: new Date().toISOString() };
    await writeFile(STATE, JSON.stringify(state, null, 2) + "\n");
  }

  // 4. Token image, byte-identical to the public URI.
  const imagePath = path.join(LAUNCH_DIR, "assets", "token.png");
  const imgRes = await fetch(LAUNCH.imageUri);
  if (!imgRes.ok) fail(`Couldn't download ${LAUNCH.imageUri} (HTTP ${imgRes.status}). Is the site deployed?`);
  const imgBytes = Buffer.from(await imgRes.arrayBuffer());
  await mkdir(path.dirname(imagePath), { recursive: true });
  if (existsSync(imagePath) && !(await readFile(imagePath)).equals(imgBytes)) {
    fail("assets/token.png differs from the image on the website. Delete it and run again.");
  }
  await writeFile(imagePath, imgBytes);
  await writeFile(
    path.join(LAUNCH_DIR, ".gitignore"),
    "protected-launch.config.json\nlaunch.json\n*.receipt.json\nsubmit-result.json\n.launch-state.json\nnode_modules\n",
  );

  // 5. Draft or final: final only when the sources are committed and pushed.
  const head = git("rev-parse", "HEAD");
  const dirty = git("status", "--porcelain", "--", ...SOURCE_PATHS);
  const pushed = head ? git("branch", "-r", "--contains", head) : null;
  const final = Boolean(head && dirty === "" && pushed);
  const revision = final ? head : "0".repeat(40);

  // 6. Build with Programmable's helper.
  const now = Math.floor(Date.now() / 1000);
  const permitWindow = { validAfter: String(now - 60), deadline: String(now + 86_400 - 600) };
  const projectMetadata = {
    schemaVersion: "programmable.project-metadata-input.v1",
    token: { name: LAUNCH.name, symbol: LAUNCH.symbol },
    presentation: {
      description: LAUNCH.description,
      image: { sourcePath: "assets/token.png", uri: LAUNCH.imageUri },
      links: [
        { kind: "website", uri: LAUNCH.website },
        { kind: "x", uri: LAUNCH.x },
        { kind: "github", uri: LAUNCH.github },
      ],
    },
  };
  const { configPath, prepared } = await buildProtectedEthereumLaunchV1({
    projectRoot: LAUNCH_DIR,
    client,
    capabilities,
    permitWindow,
    input: {
      launchWallet: LAUNCH.launchWallet,
      nonce: state.nonce,
      projectMetadata,
      supply: LAUNCH.supply,
      initialBuyWei: initialBuyWei.toString(),
      minimumTokensOut: minimumTokensOut.toString(),
      creatorBuyFeeBps: LAUNCH.creatorFeeBps,
      creatorSellFeeBps: LAUNCH.creatorFeeBps,
      additionalTaxExemptWallets: LAUNCH.additionalTaxExemptWallets,
      publicOrigin: { url: LAUNCH.sourceRepo, revision },
    },
  });

  const tokens = (v) => (Number(v / 10n ** 14n) / 1e4).toLocaleString("en-US");
  say("\n── Continuum launch request ─────────────────────────");
  say(`Token            ${LAUNCH.name} (${LAUNCH.symbol}), supply ${tokens(supply)}`);
  say(`Launch wallet    ${LAUNCH.launchWallet}`);
  say(`Fees             0.3% Programmable + ${LAUNCH.creatorFeeBps / 100}% creator, buys and sells`);
  say(`Protection       ${protection.openingTotalFeePpm / 10_000}% opening fee over ${protection.openingFeeSeconds}s, ${protection.walletLimitBps / 100}% cap for ${protection.protectionSeconds}s, min FDV $${minFdv.toLocaleString("en-US")}`);
  say(`ETH/USD          $${ethUsd.toFixed(2)}`);
  say(`First buy        ${formatEther(initialBuyWei)} ETH (≈ $${LAUNCH.initialBuyUsd}), at least ${tokens(minimumTokensOut)} ${LAUNCH.symbol}`);
  say(`Predicted token  ${prepared.contracts.token.address}`);
  say(`Predicted hook   ${prepared.contracts.hook.address}`);
  say(`Config           ${configPath}`);

  if (!final) {
    say(`
DRAFT: sources written to ${LAUNCH_DIR}. Publish them, then run this script again:

  cd ${LAUNCH_DIR}
  git add -A && git commit -m "Continuum protected launch sources"
  git branch -M main
  git remote add origin ${LAUNCH.sourceRepo}.git   # skip if already added
  git push -u origin main
  node ${process.argv[1]}
`);
  } else {
    say(`
READY: bound to commit ${revision}.
Next:  bash ${path.join(path.dirname(process.argv[1]), "submit.sh")}
`);
  }
}

main().catch((e) => fail(e?.message || String(e)));
