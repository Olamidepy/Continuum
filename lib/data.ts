import { isAddress, type Address } from "viem";

// All Wronskian copy and numbers in one place. Edit here, not in components.

const env = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);
const addr = (v: string | undefined) => {
  const a = env(v);
  return a && isAddress(a) ? (a as Address) : undefined;
};

export const SITE = {
  name: "Wronskian",
  ticker: "WRON",
  /** The brand definition. */
  definition: "W ≠ 0. Stay independent.",
  tagline: "W ≠ 0. Stay independent.",
  description:
    "Wronskian (WRON): W ≠ 0. Stay independent. Lock WRON for 3 to 30 days. Every early exit forfeits 10%, and it flows straight to the holders who stayed.",
  url: env(process.env.NEXT_PUBLIC_APP_URL) ?? "https://wronskian.live",
  x: "https://x.com/wronskian_xyz",
  xHandle: "@wronskian_xyz",
  chain: "Ethereum",
  venue: "Uniswap v4",
} as const;

/**
 * WRON launches with its own Uniswap v4 hook (launch/ in this repo). Nothing is set until the launch is final,
 * so the site never shows an address that could be copied by scammers before then.
 */
// Official launch addresses (Programmable protected launch). Env vars can still override them.
const LAUNCH_TOKEN = "0x81949fe9909658CdB0cB71d877366D6e9B10493f";
const LAUNCH_HOOK = "0xdcf426d00a648c441577a728bfedac1866c320cc";
const tokenAddress = addr(process.env.NEXT_PUBLIC_WRON_TOKEN_ADDRESS || LAUNCH_TOKEN);
const ticker = "WRON";

export const TOKEN = {
  address: tokenAddress,
  hook: addr(process.env.NEXT_PUBLIC_WRON_HOOK_ADDRESS || LAUNCH_HOOK),
  feeVault: addr(process.env.NEXT_PUBLIC_WRON_FEE_VAULT_ADDRESS),
  symbol: `$${ticker.replace(/^\$/, "")}`,
  unit: ticker.replace(/^\$/, ""),
  supply: 1_000_000_000,
  decimals: 18,
  /** Pool settings, fixed in WronskianHook: ETH pair, LP fee 0 (the hook charges the fee), tick spacing 60. */
  poolFee: 0,
  tickSpacing: 60,
  /*
   * Launch protection, fixed in WronskianHook: for the first 300 s no wallet can buy more than 2% of supply in
   * total, and the buy fee starts at 99% and falls to the normal 5% over 30 s.
   */
  protectionSeconds: 300,
  walletCapPct: 2,
  openingFeePct: 99,
  openingFeeSeconds: 30,
  startFdvUsd: 16_000,
  /** Dev's first buy at launch, in USD. */
  initialBuyUsd: 2,
  /** Fee on every buy and sell in the official pool, in percent. All of it goes to the dev wallet. */
  fee: 5,
  etherscan: tokenAddress ? `https://etherscan.io/token/${tokenAddress}` : undefined,
  dexscreener: tokenAddress ? `https://dexscreener.com/ethereum/${tokenAddress}` : undefined,
};

/** WronskianVault. Deployed after the token is live. */
export const VAULT = {
  address: addr(process.env.NEXT_PUBLIC_WRON_VAULT_ADDRESS),
};

/** The dev wallet: launches the token, makes the first buy and receives the 5% fee. Public on purpose. */
export const DEV_WALLET = "0x4044bEBa840B1820B7d3858b65Aa5Fa8729b2db5" as Address;

export const LIVE = Boolean(TOKEN.address && VAULT.address);

export const NAV = [
  { href: "/vaults", label: "Vaults" },
  { href: "/trade", label: "Trade" },
  { href: "/docs", label: "Docs" },
  { href: "/faq", label: "FAQ" },
] as const;

export type Tier = { id: 0 | 1 | 2 | 3; days: number; weight: number; label: string };

/** Must match WronskianVault.duration() and multiplier(). */
export const TIERS: Tier[] = [
  { id: 0, days: 3, weight: 1.0, label: "3 days" },
  { id: 1, days: 7, weight: 1.2, label: "7 days" },
  { id: 2, days: 14, weight: 1.5, label: "14 days" },
  { id: 3, days: 30, weight: 2.0, label: "30 days" },
];

/** Early-exit forfeit. All of it goes to the vaults still locked. */
export const PENALTY = { pct: 10 } as const;

export const STEPS = [
  { title: "Lock", body: "Pick an amount and a length: 3, 7, 14 or 30 days. Longer locks get a bigger share of rewards." },
  { title: "Earn while you wait", body: "When someone leaves early, the 10% they forfeit is shared across every vault still locked. Claim it any time." },
  { title: "Take it all back", body: "On your unlock day, withdraw your full amount plus everything you earned. No fee for finishing." },
] as const;

export const FAQ = [
  {
    group: "Basics",
    q: "What is Wronskian?",
    a: "WRON is a token on Ethereum with a vault built in. You lock WRON for a set time. People who break their lock early forfeit 10%, and all of it is paid to everyone who is still locked. W ≠ 0: stay independent.",
  },
  {
    group: "Basics",
    q: "Can I get my tokens out before my unlock day?",
    a: "Yes, any time. You get back 90% of what you locked plus every reward you've earned. The other 10% is the early-exit fee.",
  },
  {
    group: "Basics",
    q: "Where does the early-exit fee go?",
    a: "All of it goes to the holders still locked, split by shares. There is no treasury cut and no team cut.",
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
    a: "Yes. Anyone can add WRON to the reward pool with the fund function. It's shared the same way as exit fees.",
  },
  {
    group: "Token",
    q: "Where do I buy the token?",
    a: "On the Trade page of this site, which trades the official Uniswap v4 pool directly. The address is posted there and on X once the launch is final. Treat any other address as fake.",
  },
  {
    group: "Token",
    q: "What fees apply to trades?",
    a: "5% of every buy and sell in the official pool, taken in ETH and paid to the dev wallet. For the first 30 seconds after launch the buy fee starts at 99% and falls to 5%, to stop sniping bots. Locking, claiming and withdrawing only cost Ethereum gas.",
  },
  {
    group: "Safety",
    q: "Can the team take my locked tokens?",
    a: "No. The vault has no owner, no admin, no pause and no upgrade. The token address is fixed at deploy, and there is no treasury. Only the wallet that opened a vault can act on it.",
  },
  {
    group: "Safety",
    q: "Has the code been audited?",
    a: "Not yet. The vault's code is verified on Etherscan when it's deployed. Don't lock more than you're prepared to lose, and never share your seed phrase. Wronskian will never ask for it.",
  },
] as const;

export const FAQ_GROUPS = ["All", "Basics", "Rewards", "Token", "Safety"] as const;

/** Free Unsplash photos, loaded from Unsplash's image CDN (as Unsplash asks). Credits show in the footer. */
const unsplash = (id: string) => (w: number) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const PHOTOS = {
  // One set: gold light on black, all by long exposure or soft focus, so every section feels the same.
  trails: { src: unsplash("photo-1629041172784-fe1bc68dc1c6"), alt: "Gold light trails in a dark room", by: "Tomás Mendes", href: "https://unsplash.com/photos/Vgxby1hqORQ" },
  disc: { src: unsplash("photo-1727564845242-a82f22476091"), alt: "A yellow ringed disc on a black background", by: "Buddha Elemental 3D", href: "https://unsplash.com/photos/edlL1vvGcLI" },
  threads: { src: unsplash("photo-1644673640522-b1b122c1cecc"), alt: "Threads of yellow light on a black background", by: "Tomás Mendes", href: "https://unsplash.com/photos/sr96SQ6jG5w" },
  road: { src: unsplash("photo-1629041172736-ccd4b630a307"), alt: "Gold streaks of traffic at night", by: "Tomás Mendes", href: "https://unsplash.com/photos/YFAQhvLhQp0" },
  glow: { src: unsplash("photo-1707568774879-49bcd6421a00"), alt: "A soft yellow glow in the dark", by: "Veronica Karoli", href: "https://unsplash.com/photos/DHgn8v93MnE" },
} as const;

export const TICKER = [
  "Lock 3 to 30 days",
  "10% early-exit fee",
  "Every early exit pays the holders who stayed",
  "Up to 2.0x weight",
  "No owner, no admin, no pause",
  "Finishing is free",
  "W ≠ 0. Stay independent.",
  "Uniswap v4 on Ethereum",
] as const;
