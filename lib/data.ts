import { isAddress, type Address } from "viem";

// All Continuum copy and numbers in one place. Edit here, not in components.

const env = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);
const addr = (v: string | undefined) => {
  const a = env(v);
  return a && isAddress(a) ? (a as Address) : undefined;
};

export const SITE = {
  name: "Continuum",
  tagline: "Lock your tokens. Earn from everyone who leaves early.",
  description:
    "Continuum is a time-locked vault on Ethereum. Lock for 3 to 30 days. Anyone who exits early pays 10%, and most of it goes to the people who stayed.",
  url: env(process.env.NEXT_PUBLIC_APP_URL) ?? "https://www.continuumxyz.live",
  x: env(process.env.NEXT_PUBLIC_X_URL) ?? "https://x.com/continuum_xyz",
  xHandle: env(process.env.NEXT_PUBLIC_X_HANDLE) ?? "@continuum_xyz",
  github: "https://github.com/Olamidepy/Continuum",
  chain: "Ethereum",
  launchpad: "Programmable",
  launchpadUrl: "https://programmable.market",
} as const;

/**
 * The token comes from the Programmable launch. Nothing here is set until the launch is finalized,
 * so the site never shows an address that could be copied by scammers before then.
 * The ticker stays off the site until NEXT_PUBLIC_TOKEN_TICKER is set.
 */
const tokenAddress = addr(process.env.NEXT_PUBLIC_CONTINUUM_TOKEN_ADDRESS);
const ticker = env(process.env.NEXT_PUBLIC_TOKEN_TICKER);

export const TOKEN = {
  address: tokenAddress,
  hook: addr(process.env.NEXT_PUBLIC_CONTINUUM_HOOK_ADDRESS),
  /** Display name until the ticker is public. */
  symbol: ticker ? `$${ticker.replace(/^\$/, "")}` : "Continuum",
  unit: ticker ? ticker.replace(/^\$/, "") : "tokens",
  supply: Number(process.env.NEXT_PUBLIC_TOKEN_SUPPLY || 1_000_000_000),
  decimals: 18,
  /** Pool settings from the launch record. Defaults match Programmable's protected launch (ETH pair, hook pool). */
  poolFee: Number(process.env.NEXT_PUBLIC_POOL_FEE || 0),
  tickSpacing: Number(process.env.NEXT_PUBLIC_POOL_TICK_SPACING || 60),
  /** Seconds after launch when only Programmable's router can buy. 0 = open to everyone from the start. */
  protectionSeconds: Number(process.env.NEXT_PUBLIC_PROTECTION_SECONDS || 0),
  /** Anti-sniper opening fee: starts at this % and falls to the normal fee over openingFeeSeconds. */
  openingFeePct: Number(process.env.NEXT_PUBLIC_OPENING_FEE_PCT || 99),
  openingFeeSeconds: Number(process.env.NEXT_PUBLIC_OPENING_FEE_SECONDS || 120),
  /** Dev's first buy at launch, in USD. */
  initialBuyUsd: Number(process.env.NEXT_PUBLIC_INITIAL_BUY_USD || 4),
  /** Creator fee on trades in the official pool, in percent. */
  creatorFee: Number(process.env.NEXT_PUBLIC_CREATOR_FEE || 2.7),
  platformFee: 0.3,
  coinPage: env(process.env.NEXT_PUBLIC_PROGRAMMABLE_COIN_URL),
  etherscan: tokenAddress ? `https://etherscan.io/token/${tokenAddress}` : undefined,
  dexscreener: tokenAddress ? `https://dexscreener.com/ethereum/${tokenAddress}` : undefined,
  uniswap: tokenAddress ? `https://app.uniswap.org/swap?chain=mainnet&inputCurrency=NATIVE&outputCurrency=${tokenAddress}` : undefined,
};

/** ContinuumVault. Deployed after the token is live. */
export const VAULT = {
  address: addr(process.env.NEXT_PUBLIC_CONTINUUM_VAULT_ADDRESS),
  treasury: addr(process.env.NEXT_PUBLIC_TREASURY_ADDRESS),
};

export const LIVE = Boolean(TOKEN.address && VAULT.address);

export const NAV = [
  { href: "/vaults", label: "Vaults" },
  { href: "/trade", label: "Trade" },
  { href: "/docs", label: "Docs" },
  { href: "/faq", label: "FAQ" },
] as const;

export type Tier = { id: 0 | 1 | 2 | 3; days: number; weight: number; label: string };

/** Must match ContinuumVault.duration() and multiplier(). */
export const TIERS: Tier[] = [
  { id: 0, days: 3, weight: 1.0, label: "3 days" },
  { id: 1, days: 7, weight: 1.2, label: "7 days" },
  { id: 2, days: 14, weight: 1.5, label: "14 days" },
  { id: 3, days: 30, weight: 2.0, label: "30 days" },
];

export const PENALTY = { pct: 10, toLockers: 80, toTreasury: 20 } as const;

export const STEPS = [
  { title: "Lock", body: "Pick an amount and a length: 3, 7, 14 or 30 days. Longer locks get a bigger share of rewards." },
  { title: "Earn while you wait", body: "When someone leaves early, 8% of what they locked is shared across every vault still locked. Claim it any time." },
  { title: "Take it all back", body: "On your unlock day, withdraw your full amount plus everything you earned. No fee for finishing." },
] as const;

export const FAQ = [
  {
    group: "Basics",
    q: "What is Continuum?",
    a: "A vault for the Continuum token on Ethereum. You lock tokens for a set time. People who break their lock early pay 10%, and 80% of that is paid to everyone who is still locked.",
  },
  {
    group: "Basics",
    q: "Can I get my tokens out before my unlock day?",
    a: "Yes, any time. You get back 90% of what you locked plus every reward you've earned. The other 10% is the early-exit fee.",
  },
  {
    group: "Basics",
    q: "Where does the early-exit fee go?",
    a: "80% is added to the reward pool for everyone still locked, split by share. 20% goes to the treasury address that was fixed when the vault was deployed.",
  },
  {
    group: "Rewards",
    q: "How are rewards split?",
    a: "By shares. Your shares are the amount you lock times your tier weight: 1.0x for 3 days, 1.2x for 7, 1.5x for 14 and 2.0x for 30. Rewards only count from the moment you lock.",
  },
  {
    group: "Rewards",
    q: "Can I add to a vault or lock for longer?",
    a: "You can add tokens to a vault that's still locked; the unlock day stays the same. You can also restart a vault on the same or a longer tier, which moves the unlock day out and re-weights your shares.",
  },
  {
    group: "Rewards",
    q: "Can rewards come from anywhere else?",
    a: "Yes. Anyone can add tokens to the reward pool with the fund function, for example part of the creator fee. They're shared the same way as exit fees.",
  },
  {
    group: "Token",
    q: "Where do I buy the token?",
    a: "Only through the official pool, launched on Programmable. The address is posted on the Trade page and on X once the launch is finalized. Treat any other address as fake.",
  },
  {
    group: "Token",
    q: "What fees apply to trades?",
    a: "A 0.3% Programmable platform fee and the creator fee shown on the Trade page apply to every buy and sell in the official pool. Locking, claiming and withdrawing only cost Ethereum gas.",
  },
  {
    group: "Safety",
    q: "Can the team take my locked tokens?",
    a: "No. The vault has no owner, no admin, no pause and no upgrade. The token and treasury addresses are fixed at deploy. Only the wallet that opened a vault can act on it.",
  },
  {
    group: "Safety",
    q: "Has the code been audited?",
    a: "Not yet. The source and tests are public on GitHub. Don't lock more than you're prepared to lose, and never share your seed phrase. Continuum will never ask for it.",
  },
] as const;

export const FAQ_GROUPS = ["All", "Basics", "Rewards", "Token", "Safety"] as const;

/** Free Unsplash photos, loaded from Unsplash's image CDN (as Unsplash asks). Credits show in the footer. */
const unsplash = (id: string) => (w: number) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const PHOTOS = {
  trails: { src: unsplash("photo-1484734278752-212d8c88a568"), alt: "Red and white light trails from traffic at night", by: "Paul Smith", href: "https://unsplash.com/photos/Sz0kMDeDUc0" },
  hourglass: { src: unsplash("photo-1643810064714-7c80c7bf68e8"), alt: "An hourglass on a black background", by: "Pablo Añón", href: "https://unsplash.com/photos/XMW-B70xZy4" },
  hourglassRed: { src: unsplash("photo-1591360236494-e6557e5ffa25"), alt: "A clear hourglass against a red background", by: "Daniele Franchi", href: "https://unsplash.com/photos/WyJ0rahs_2k" },
  curves: { src: unsplash("photo-1708533548050-16703eff12ec"), alt: "Abstract black and red curves", by: "Pawel Czerwinski", href: "https://unsplash.com/photos/GycPY2LU2Ew" },
  stars: { src: unsplash("photo-1502864580248-63061f3f5998"), alt: "Star trails over a night sky", by: "Mohdammed Ali", href: "https://unsplash.com/photos/zZvofYjfVXw" },
} as const;

export const TICKER = [
  "Lock 3 to 30 days",
  "10% early-exit fee",
  "80% of every exit fee goes to lockers",
  "Up to 2.0x weight",
  "No owner, no admin, no pause",
  "Finishing is free",
  "Launching on Programmable",
  "Uniswap v4 on Ethereum",
] as const;
