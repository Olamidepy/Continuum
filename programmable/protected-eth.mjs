#!/usr/bin/env node
// Wronskian (WRON): build, preflight and submit a PROTECTED Programmable Custom Launch on Ethereum mainnet (chain 1).
//
// Wronskian launches with Programmable's own protected contracts (token, hook, initializer, fee vaults), built by
// their verified @programmable/launch 4.1.7 release through buildProtectedEthereumLaunchV1, the same package
// Neutrino used on Robinhood Chain. Nothing here signs or sends a transaction: it prepares the request that
// Programmable reviews. The dev wallet signs on programmable.market after approval.
//
// Usage (from the contracts folder, after `bash launch/setup.sh`):
//   node launch/protected-eth.mjs prepare     write the exact contract sources into programmable/project (commit and push them)
//   node launch/protected-eth.mjs build       build the launch request, write launch/out/
//   node launch/protected-eth.mjs preflight   build if needed, then preflight (needs PROGRAMMABLE_API_KEY)
//   node launch/protected-eth.mjs submit      build if needed, preflight, create; prints the launch ID
//
// Environment: PROGRAMMABLE_API_KEY (never paste it into chat), ETHEREUM_RPC_URL (optional),
//              PUBLIC_ORIGIN_URL and PUBLIC_ORIGIN_REVISION (optional; read from programmable/project's git otherwise).

import { execFileSync } from "node:child_process";
import { setDefaultResultOrder } from "node:dns";
import { createHash, randomBytes } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = join(HERE, "project"); // the exact reviewed sources, committed in the public Wronskian repo
const OUT = join(HERE, "out");
const CONFIG_BYTES = readFileSync(join(HERE, "wronskian.launch.json"));
const CONFIG = JSON.parse(CONFIG_BYTES);
const CONFIG_SHA = createHash("sha256").update(CONFIG_BYTES).digest("hex");
const API = "https://api.programmable.market";
const CHAIN = 1;
const RPC = process.env.ETHEREUM_RPC_URL || "https://ethereum-rpc.publicnode.com";
const PACKAGE_VERSION = "4.1.7";
const IMAGE_PATH = "assets/wronskian-logo.png"; // inside programmable/project
const PLATFORM_BPS = 30; // Programmable's 0.3%, fixed by the protected hook

// WSL often advertises IPv6 that never connects; prefer IPv4.
setDefaultResultOrder("ipv4first");
const log = (...a) => console.log(...a);
const fail = (m) => { console.error(`\n✖ ${m}\n`); process.exit(1); };
const json = (v) => JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x), 2);

// Load viem and Programmable's package from launch/node_modules (installed by setup.sh).
const require = createRequire(join(HERE, "package.json"));
async function load(name) {
  try { return await import(pathToFileURL(require.resolve(name)).href); }
  catch { fail(`Missing ${name}. Run \`bash launch/setup.sh\` first.`); }
}
const viem = await load("viem");
const sdk = await load("@programmable/launch");
const lp = await load("@programmable/launch/launch-protection");
const PKG_DIR = join(HERE, "node_modules", "@programmable", "launch");
const pkg = JSON.parse(readFileSync(join(PKG_DIR, "package.json"), "utf8"));
if (pkg.version !== PACKAGE_VERSION) fail(`Expected @programmable/launch ${PACKAGE_VERSION}, found ${pkg.version}. Rerun setup.sh.`);

async function getJson(path) {
  const res = await fetch(`${API}${path}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(60_000) });
  const text = await res.text();
  try { return { status: res.status, body: JSON.parse(text) }; } catch { return { status: res.status, body: text }; }
}
const git = (...args) => execFileSync("git", ["-C", PROJECT, ...args], { encoding: "utf8" }).trim();

// ───────────────────────── prepare: write the exact sources ─────────────────────────

// Writes a file, or checks an existing one is byte-identical (the same rule Programmable's builder applies).
function exactFile(file, content) {
  mkdirSync(dirname(file), { recursive: true });
  const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content);
  if (existsSync(file)) { if (!readFileSync(file).equals(bytes)) fail(`${file} exists with different content. Don't edit files in programmable/project.`); return; }
  writeFileSync(file, bytes);
}

function prepare() {
  log("Writing Programmable's protected contract sources to programmable/project…");
  const kit = join(PKG_DIR, "contracts", "launch-protection-v1");
  const standardBytes = readFileSync(join(kit, "standard-json.json"));
  const standard = JSON.parse(standardBytes);
  for (const [source, value] of Object.entries(standard.sources)) exactFile(join(PROJECT, source), value.content);
  exactFile(join(PROJECT, "protection", "standard-json.json"), standardBytes);
  const roles = { initializer: "ProtectedNativeInitializerV1", token: "ProtectedLaunchTokenV1", hook: "ProtectedNative30HookV1" };
  for (const [role, name] of Object.entries(roles))
    exactFile(join(PROJECT, "protection", "artifacts", `${role}.json`), readFileSync(join(kit, `${name}.artifact.json`)));
  exactFile(join(PROJECT, "protection", "evidence.json"), JSON.stringify({ schemaVersion: "programmable.launch-protection-build.v1",
    policy: lp.PROTECTED_LAUNCH_POLICY_V1, signing: false, broadcast: false }) + "\n");
  const image = join(HERE, CONFIG.imageFile);
  if (!existsSync(image)) fail(`Logo not found at ${image}.`);
  mkdirSync(join(PROJECT, "assets"), { recursive: true });
  if (!existsSync(join(PROJECT, IMAGE_PATH))) copyFileSync(image, join(PROJECT, IMAGE_PATH));
  if (!existsSync(join(PROJECT, ".gitignore"))) writeFileSync(join(PROJECT, ".gitignore"), "protected-launch.config.json\n");
  if (!existsSync(join(PROJECT, "README.md"))) writeFileSync(join(PROJECT, "README.md"),
    "# Wronskian (WRON) launch sources\n\nThe exact contract sources for the Wronskian (WRON) launch on Ethereum: Programmable's protected launch package\n(`@programmable/launch` 4.1.7, `contracts/launch-protection-v1`), unmodified. Do not edit these files.\n");
  log(`     ${Object.keys(standard.sources).length} source files written.\n`);
  log("Next: commit and push programmable/project with the rest of the Wronskian repo (it must be public), then run `build`:\n");
  log("   git add -A && git commit -m \"Add launch sources\" && git push\n");
}

// The public repo and commit that hold the sources: the Wronskian repo itself, with programmable/project committed in it.
function publicOrigin() {
  let url = process.env.PUBLIC_ORIGIN_URL, revision = process.env.PUBLIC_ORIGIN_REVISION;
  if (!url || !revision) {
    try { git("rev-parse", "--is-inside-work-tree"); } catch { fail("programmable/project is not inside a git repo. Run `prepare`, then commit and push it."); }
    if (git("status", "--porcelain", "--", ".")) fail("programmable/project has uncommitted changes. Commit and push them first.");
    revision = revision || git("rev-parse", "HEAD");
    url = url || git("remote", "get-url", "origin");
    if (!git("branch", "-r", "--contains", revision)) fail("The latest commit isn't pushed to GitHub. Run `git push` first.");
  }
  url = url.replace(/^git@github\.com:/, "https://github.com/").replace(/\.git$/, "");
  if (!/^https:\/\//.test(url) || !/^[0-9a-f]{40}$/.test(revision)) fail(`Bad public origin: ${url} @ ${revision}`);
  return { url, revision };
}

// ───────────────────────── build ─────────────────────────

async function live() {
  log("1/4  Reading live Programmable state…");
  mkdirSync(OUT, { recursive: true });
  const protection = await getJson("/v1/launch-protection");
  writeFileSync(join(OUT, "live-launch-protection.json"), json(protection.body));
  let caps;
  try { caps = (await sdk.getLaunchCapabilities({ apiVersion: 3 })).resource; }
  catch (error) { fail(`Couldn't read Ethereum capabilities: ${error.message}`); }
  writeFileSync(join(OUT, "live-capabilities.json"), json(caps));
  if (caps.chain?.id !== "1") fail("Capabilities are not for Ethereum mainnet.");
  if (caps.profile?.profileVersion !== "3.6.0" || caps.profile?.productionLaunchAuthorized !== true)
    fail(`Programmable's live Ethereum profile is ${caps.profile?.profileVersion}, but package ${PACKAGE_VERSION} builds 3.6.0. A newer @programmable/launch release is needed. Tell Claude.`);
  const p = protection.body, policy = lp.PROTECTED_LAUNCH_POLICY_V1;
  if (protection.status !== 200) log(`     note: launch-protection returned HTTP ${protection.status}.`);
  else {
    for (const k of ["minimumFdvUsd", "walletLimitBps", "buyerLimitBps", "protectionSeconds", "openingTotalFeePpm"])
      if (p[k] !== undefined && String(p[k]) !== String(policy[k])) fail(`Live protection policy ${k}=${p[k]} differs from package ${PACKAGE_VERSION} (${policy[k]}). A newer @programmable/launch release is needed. Tell Claude.`);
    if (p.supportedChains && !p.supportedChains.map(String).includes(String(CHAIN))) fail("Protection does not list Ethereum.");
  }
  const rate = caps.programmableTradeFeePolicy?.policy?.rateBps;
  log(`     profile ${caps.profile.profileVersion}, protection ${p?.required ? "required ✓" : "optional"}, Programmable trade fee policy ${rate ?? "?"} bps`);
  if (rate !== undefined && rate !== PLATFORM_BPS)
    log(`     ⚠ The live policy says ${rate} bps, not ${PLATFORM_BPS}. Preflight will report how this launch is charged. Read it before submitting.`);
  return caps;
}

async function build() {
  const c = CONFIG;
  const origin = publicOrigin();
  const caps = await live();
  const developer = viem.getAddress(c.controller);
  if (c.supply !== "1000000000000000000000000000") fail("Supply must be 1,000,000,000 tokens (1e27 base units).");
  const client = viem.createPublicClient({ transport: viem.http(RPC, { timeout: 60_000, retryCount: 3 }) });
  if (await client.getChainId() !== CHAIN) fail(`RPC ${RPC} is not Ethereum mainnet.`);

  // First buy: USD amount → ETH at the onchain Chainlink ETH/USD price that the protected initializer itself uses.
  const pins = lp.PROTECTED_LAUNCH_CHAIN_PINS_V1[CHAIN];
  const feedAbi = viem.parseAbi(["function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)", "function decimals() view returns (uint8)"]);
  const [round, feedDecimals] = await Promise.all([
    client.readContract({ address: pins.feed, abi: feedAbi, functionName: "latestRoundData" }),
    client.readContract({ address: pins.feed, abi: feedAbi, functionName: "decimals" })]);
  if (round[1] <= 0n) fail("The ETH/USD feed returned no price.");
  const usdCents = BigInt(Math.round(c.initialBuyUsd * (100 + c.initialBuyBufferPercent)));
  const initialBuyWei = (usdCents * 10n ** 18n * 10n ** BigInt(feedDecimals) + round[1] * 100n - 1n) / (round[1] * 100n);
  const ethUsd = Number(round[1]) / 10 ** Number(feedDecimals);
  log(`     ETH/USD ${ethUsd.toFixed(2)} → first buy ${viem.formatEther(initialBuyWei)} ETH (≈ $${(Number(usdCents) / 100).toFixed(2)})`);

  // Minimum tokens the first buy must return: the opening price less the normal fee, with a 10% safety margin.
  // The dev wallet is exempt from the extra opening fee, so it pays only the normal fee.
  const supply = BigInt(c.supply);
  const price = lp.protectedOpeningPriceV1({ supply: c.supply, answer: round[1], feedDecimals: Number(feedDecimals), targetFdvUsd: String(c.targetFdvUsd) });
  const netWei = initialBuyWei * BigInt(10_000 - PLATFORM_BPS - c.creatorFeeBps) / 10_000n;
  const expected = netWei * price.sqrtPriceX96 * price.sqrtPriceX96 / (1n << 192n);
  const minimum = expected * 90n / 100n;
  if (minimum <= 0n) fail("The first buy is too small to return any tokens.");
  if (expected > supply / 50n) fail("The first buy is above the 2% protection limit. Lower initialBuyUsd.");
  log(`     opening FDV ≈ $${price.openingFdvUsd}, first buy ≈ ${viem.formatUnits(expected, 18)} ${c.symbol} (minimum ${viem.formatUnits(minimum, 18)})`);

  log(`2/4  Building Programmable's protected contracts for ${c.name}…`);
  const nonce = `0x${randomBytes(32).toString("hex")}`;
  const now = Math.floor(Date.now() / 1000);
  // Permit window: at most 24 hours. LAUNCH_DEADLINE (unix seconds) overrides the default 23 hours.
  const deadline = process.env.LAUNCH_DEADLINE ? Math.min(Number(process.env.LAUNCH_DEADLINE), now + 86_000) : now + 23 * 3600;
  if (!(deadline > now + 900)) fail("LAUNCH_DEADLINE must be at least 15 minutes from now.");
  const projectMetadata = {
    schemaVersion: "programmable.project-metadata-input.v1",
    token: { name: c.name, symbol: c.symbol },
    presentation: {
      description: c.description.normalize("NFC").trim(),
      // Programmable wants each address in its canonical form (for example with the trailing slash).
      image: { sourcePath: IMAGE_PATH, uri: new URL(c.imageUrl).href },
      links: [{ kind: "website", uri: new URL(c.website).href }, { kind: "x", uri: new URL(c.x).href }],
    },
  };
  let result;
  try {
    result = await lp.buildProtectedEthereumLaunchV1({
      projectRoot: PROJECT, client, capabilities: caps,
      permitWindow: { validAfter: String(now - 60), deadline: String(deadline) },
      input: {
        launchWallet: developer, nonce, projectMetadata, supply: c.supply, targetFdvUsd: String(c.targetFdvUsd),
        initialBuyWei: initialBuyWei.toString(), minimumTokensOut: minimum.toString(),
        creatorBuyFeeBps: c.creatorFeeBps, creatorSellFeeBps: c.creatorFeeBps,
        additionalTaxExemptWallets: c.additionalTaxExemptWallets ?? [], publicOrigin: origin,
      },
    });
  } catch (error) { fail(`The protected builder stopped: ${error.message}\n  Copy this whole output to Claude.`); }
  const addr = Object.fromEntries(Object.entries(result.prepared.contracts).map(([k, v]) => [k, v.address]));
  log(`     token ${addr.token}\n     hook  ${addr.hook}`);

  log("3/4  Packing the request…");
  const launchPath = join(OUT, `launch-${nonce.slice(2, 10)}.json`);
  try {
    await sdk.packLaunch({ configPath: result.configPath, outputPath: launchPath,
      directNativeTradeFeePolicy: caps.programmableTradeFeePolicy?.policy });
  } catch (error) { fail(`Packing stopped: ${error.message}\n  Copy this whole output to Claude.`); }
  const summary = { built: new Date().toISOString(), validUntil: new Date(deadline * 1000).toISOString(), configSha256: CONFIG_SHA,
    publicOrigin: origin, launchPath, configPath: result.configPath, addresses: addr, nonce,
    creatorFeeBps: c.creatorFeeBps, platformFeeBps: PLATFORM_BPS, initialBuyWei: initialBuyWei.toString(), ethUsdAtBuild: ethUsd,
    initialTick: result.prepared.price.initialTick, openingSqrtPriceX96: String(result.prepared.price.sqrtPriceX96),
    openingFdvUsd: String(result.prepared.price.openingFdvUsd), minimumInitialTokensOut: minimum.toString() };
  writeFileSync(join(OUT, "summary.json"), json(summary));
  log(`     request written to ${launchPath} (valid until ${summary.validUntil})`);
  return summary;
}

// ───────────────────────── preflight and create ─────────────────────────

async function submit(create) {
  if (!process.env.PROGRAMMABLE_API_KEY) fail("Set PROGRAMMABLE_API_KEY first: read -rsp \"API key: \" PROGRAMMABLE_API_KEY; export PROGRAMMABLE_API_KEY");
  let summary = existsSync(join(OUT, "summary.json")) ? JSON.parse(readFileSync(join(OUT, "summary.json"), "utf8")) : null;
  if (!summary || summary.configSha256 !== CONFIG_SHA || !existsSync(summary.launchPath) || Date.parse(summary.validUntil) - Date.now() < 15 * 60_000) summary = await build();
  log("4/4  Preflight…");
  let pre;
  try { pre = await sdk.validateLaunchRemote({ launchPath: summary.launchPath, configPath: summary.configPath }); }
  catch (error) { fail(`Preflight stopped: ${error.message}\n  Copy this whole output to Claude (it contains no secrets).`); }
  writeFileSync(join(OUT, "preflight.json"), json(pre.preflight ?? pre));
  const blockers = pre.hardBlockFindingCodes ?? [], evidence = pre.needsEvidenceFindingCodes ?? [], warnings = pre.warningFindingCodes ?? [];
  log(`     HTTP ${pre.preflightHttpStatus}, disposition: ${pre.disposition ?? "unknown"}, deployable: ${pre.launchEligibility?.deployable ?? "?"}`);
  for (const code of blockers) log(`     ✖ blocker: ${code}`);
  for (const code of evidence) log(`     • needs evidence: ${code}`);
  for (const code of warnings) log(`     • warning: ${code}`);
  if (blockers.length || pre.disposition === "unsupported") fail("Preflight has blockers. Send launch/out/preflight.json to Claude (no secrets in it).");
  if (!create) { log("\n✔ Preflight passed. Run `node launch/protected-eth.mjs submit`."); return; }
  log("     Creating the launch…");
  let made;
  try { made = await sdk.submitLaunch({ launchPath: summary.launchPath, configPath: summary.configPath, stateDirectory: join(OUT, "state") }); }
  catch (error) { fail(`Create stopped: ${error.message}\n  Rerunning reuses the same request. Copy this output to Claude.`); }
  writeFileSync(join(OUT, "created.json"), json(made));
  const r = made.resource ?? {};
  log(`\n✔ Submitted to Programmable for review.\n\n   Launch ID: ${r.requestId ?? r.launchId ?? r.id ?? "see launch/out/created.json"}\n   Status:    ${r.status ?? "?"}\n   Link:      ${r.walletHandoffUrl ?? r.resumeUrl ?? "see launch/out/created.json"}\n`);
  log("   After approval: open it in “Your launches” on programmable.market with the dev wallet and sign.");
}

const step = process.argv[2] ?? "build";
if (step === "prepare") prepare();
else if (step === "build") await build();
else if (step === "preflight") await submit(false);
else if (step === "submit") await submit(true);
else fail(`Unknown step "${step}". Use prepare, build, preflight or submit.`);
