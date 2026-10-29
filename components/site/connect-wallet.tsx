"use client";

import * as React from "react";
import { Check, Copy, ExternalLink, LoaderCircle, LogOut, QrCode, Smartphone, TriangleAlert, Wallet } from "lucide-react";
import { useConnect, useConnection, useConnectors, useDisconnect, useSwitchChain, type Connector } from "wagmi";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CHAIN } from "@/lib/web3/config";
import { friendlyError, shortAddress } from "@/lib/web3/format";
import { cn } from "@/lib/utils";

/** Hides the generic "Injected" entry when the browser already announced named wallets (MetaMask, Rabby, …). */
function useWalletList() {
  const connectors = useConnectors();
  return React.useMemo(() => {
    const named = connectors.filter((c) => c.type === "injected" && c.id !== "injected");
    return connectors.filter((c) => !(c.id === "injected" && named.length > 0));
  }, [connectors]);
}

function ConnectorIcon({ connector }: { connector: Connector }) {
  if (connector.icon) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={connector.icon} alt="" className="size-5 rounded" />;
  }
  if (connector.type === "walletConnect") return <QrCode className="size-4" aria-hidden="true" />;
  return <Wallet className="size-4" aria-hidden="true" />;
}

function label(c: Connector) {
  if (c.type === "walletConnect") return "WalletConnect";
  if (c.id === "injected") return "Browser wallet";
  return c.name;
}

/** Wallet button for the nav and page actions. Opens a picker; once connected, shows the address. */
export function ConnectWallet({ size = "sm", className }: { size?: "sm" | "default" | "lg"; className?: string }) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const { address, isConnected, chainId, connector } = useConnection();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const switchChain = useSwitchChain();
  const wallets = useWalletList();

  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    if (isConnected) setOpen(false);
  }, [isConnected]);

  const wrongChain = isConnected && chainId !== CHAIN.id;
  const hasBrowserWallet = wallets.some((c) => c.type === "injected" && c.id !== "injected");

  // Before hydration, render the same idle button the server did.
  if (!mounted || !isConnected || !address) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="default" size={size} className={className}>
            <Wallet />
            Connect wallet
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect a wallet</DialogTitle>
            <DialogDescription>Use the wallet that holds your Continuum tokens and vaults.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {wallets.map((c) => {
              const pending = connect.isPending && connect.variables?.connector === c;
              return (
                <button
                  key={c.uid}
                  type="button"
                  disabled={connect.isPending}
                  onClick={() => {
                    // WalletConnect shows its own QR / app list, so close ours first.
                    if (c.type === "walletConnect") setOpen(false);
                    connect.mutate({ connector: c, chainId: CHAIN.id });
                  }}
                  className="flex items-center justify-between rounded-lg border bg-background px-4 py-3 text-left text-sm transition-colors hover:bg-accent disabled:opacity-60"
                >
                  <span className="flex items-center gap-3">
                    <span className="grid size-8 place-items-center rounded-md bg-muted">
                      <ConnectorIcon connector={c} />
                    </span>
                    <span>
                      {label(c)}
                      {c.type === "walletConnect" ? <span className="block text-xs text-muted-foreground">Phone wallets and QR code</span> : null}
                    </span>
                  </span>
                  {pending ? <LoaderCircle className="size-4 animate-spin text-muted-foreground" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
          {!hasBrowserWallet ? (
            <div className="flex items-start gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
              <Smartphone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>On a phone, you can also open this site inside your wallet app's browser (MetaMask, Rainbow, Coinbase Wallet) and connect from there.</p>
            </div>
          ) : null}
          {connect.error ? <p className="text-sm text-destructive">{friendlyError(connect.error)}</p> : null}
          <p className="text-xs text-muted-foreground">Continuum will never ask for your seed phrase or private key.</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={wrongChain ? "outline" : "secondary"} size={size} className={cn("num", className)}>
          {wrongChain ? <TriangleAlert className="text-dawn" /> : <span className="size-2 rounded-full bg-primary" aria-hidden="true" />}
          {wrongChain ? "Wrong network" : shortAddress(address)}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Your wallet</DialogTitle>
          <DialogDescription>Connected with {connector?.name ?? "your wallet"}.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm num">
          <span className="truncate">{address}</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Copy address"
            onClick={() => {
              navigator.clipboard?.writeText(address);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check /> : <Copy />}
          </Button>
        </div>
        {wrongChain ? (
          <Button onClick={() => switchChain.mutate({ chainId: CHAIN.id })} disabled={switchChain.isPending}>
            {switchChain.isPending ? <LoaderCircle className="animate-spin" /> : <TriangleAlert />}
            Switch to {CHAIN.name}
          </Button>
        ) : null}
        {switchChain.error ? <p className="text-sm text-destructive">{friendlyError(switchChain.error)}</p> : null}
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline">
            <a href={`https://etherscan.io/address/${address}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink />
              Etherscan
            </a>
          </Button>
          <Button variant="outline" onClick={() => disconnect.mutate()}>
            <LogOut />
            Disconnect
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
