import { createConfig, http } from "wagmi";
import { mainnet } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

/** Wronskian lives on Ethereum mainnet. */
export const CHAIN = mainnet;

/** WalletConnect powers mobile wallets and QR codes. Free id from dashboard.reown.com. */
export const WALLETCONNECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://wronskian.live";

/** Optional RPC link for reads. Use a key restricted to this site's domain; it is visible in the browser. */
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || undefined;

export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [
    injected({ shimDisconnect: true }),
    ...(WALLETCONNECT_ID
      ? [
          walletConnect({
            projectId: WALLETCONNECT_ID,
            showQrModal: true,
            metadata: {
              name: "Wronskian",
              description: "Time-locked vaults on Ethereum.",
              url: SITE_URL,
              icons: [`${SITE_URL}/logo.png`],
            },
          }),
        ]
      : []),
  ],
  transports: { [mainnet.id]: http(RPC_URL) },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
