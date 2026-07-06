/**
 * Utility functions for formatting values in Continuum
 */

/**
 * Truncates a Stacks or Bitcoin address for display
 * e.g., SP3FBR2...QAHHHT2K4
 */
export function formatAddress(address: string | null | undefined, chars = 6): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 3) return address;
  return `${address.substring(0, chars)}...${address.substring(address.length - chars)}`;
}

/**
 * Formats micro-STX (1e6) to a readable STX amount
 */
export function formatSTX(microStx: number, decimals = 2): string {
  const stx = microStx / 1_000_000;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(stx);
}

/**
 * Formats sBTC satoshis (1e8) to a readable sBTC amount
 */
export function formatSBTC(satoshis: number, decimals = 8): string {
  const sbtc = satoshis / 100_000_000;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(sbtc);
}

/**
 * Formats numeric inputs with commas
 */
export function formatNumber(val: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

/**
 * Estimates time remaining based on Stacks block differences
 * Assumes approximately 10 minutes per block (pre-Nakamoto/average)
 */
export function blocksToTimeRemaining(blocks: number): {
  days: number;
  hours: number;
  minutes: number;
} {
  if (blocks <= 0) return { days: 0, hours: 0, minutes: 0 };
  const totalMinutes = blocks * 10;
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  return { days, hours, minutes };
}

/**
 * Returns a countdown string representing the blocks remaining
 */
export function formatBlockCountdown(targetBlock: number, currentBlock: number): string {
  const diff = targetBlock - currentBlock;
  if (diff <= 0) return 'Matured';
  const { days, hours } = blocksToTimeRemaining(diff);
  if (days > 0) {
    return `${days}d ${hours}h left (${diff} blocks)`;
  }
  return `${hours}h left (${diff} blocks)`;
}

/**
 * Converts block duration to standard name
 */
export function blocksToDurationLabel(blocks: number): string {
  if (blocks >= 52560) return '365 Days';
  if (blocks >= 25920) return '180 Days';
  if (blocks >= 12960) return '90 Days';
  if (blocks >= 4320) return '30 Days';
  return `${Math.round(blocks / 144)} Days`;
}
