import { formatUnits } from "viem";

export function shortAddress(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/** Token amount (18 decimals) as a short readable number. */
export function fmtToken(v?: bigint, digits = 4) {
  if (v === undefined) return "—";
  const n = Number(formatUnits(v, 18));
  if (n === 0) return "0";
  if (n < 0.0001) return "<0.0001";
  return n.toLocaleString("en-US", { maximumFractionDigits: n >= 1000 ? 0 : digits });
}

export function fmtUsd(n?: number) {
  if (n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n < 1 ? 6 : 2 });
}

export function fmtEth(n?: number) {
  if (n === undefined || !Number.isFinite(n)) return "—";
  return `${n.toLocaleString("en-US", { maximumSignificantDigits: 4 })} ETH`;
}

export function fmtDate(unixSeconds: number | bigint) {
  return new Date(Number(unixSeconds) * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** "12 days left", "3 hours left" or "Unlocked". */
export function timeLeft(unlockAt: number | bigint, now = Date.now() / 1000) {
  const s = Number(unlockAt) - now;
  if (s <= 0) return "Unlocked";
  const d = Math.floor(s / 86400);
  if (d >= 1) return `${d} day${d === 1 ? "" : "s"} left`;
  const h = Math.max(1, Math.floor(s / 3600));
  return `${h} hour${h === 1 ? "" : "s"} left`;
}

/** Turns a wallet or contract error into one plain sentence. */
export function friendlyError(e: unknown): string {
  const err = e as { shortMessage?: string; message?: string; name?: string; cause?: { data?: { errorName?: string } } };
  const name = err?.cause?.data?.errorName;
  const known: Record<string, string> = {
    ZeroAmount: "Enter an amount above zero.",
    InvalidTier: "Pick one of the four lock lengths.",
    NotVaultOwner: "That vault belongs to a different wallet.",
    VaultClosed: "That vault is already closed.",
    StillLocked: "This vault hasn't reached its unlock day yet.",
    AlreadyUnlocked: "This vault is already unlocked. Withdraw it instead.",
    TierTooShort: "Pick the same or a longer lock length.",
    ERC20InsufficientBalance: "Your wallet doesn't hold that many tokens.",
    ERC20InsufficientAllowance: "Approve the vault to use your tokens first.",
  };
  if (name && known[name]) return known[name];
  const msg = err?.shortMessage || err?.message || "";
  if (/user rejected|denied|rejected the request/i.test(msg)) return "You cancelled the request in your wallet.";
  if (/insufficient funds/i.test(msg)) return "Not enough ETH for gas.";
  if (/chain mismatch|wrong network|does not match the target chain/i.test(msg)) return "Switch your wallet to Ethereum and try again.";
  if (/connector not found|provider not found/i.test(msg)) return "No wallet found in this browser. Install one or use WalletConnect.";
  return msg.split("\n")[0] || "Something went wrong. Try again.";
}
