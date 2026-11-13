import type { Metadata, Viewport } from "next";
import "@fontsource-variable/syne";
import "@fontsource-variable/nunito";

import { Web3Provider } from "@/components/providers/web3";
import { Footer } from "@/components/site/footer";
import { Nav } from "@/components/site/nav";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SITE } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: "Wronskian (WRON): W ≠ 0. Stay independent.", template: "%s · Wronskian" },
  description: SITE.description,
  openGraph: { images: [{ url: "/og.png", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", site: SITE.xHandle, images: ["/og.png"] },
};

export const viewport: Viewport = { themeColor: "#050505", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-dvh flex-col overflow-x-hidden">
        <Web3Provider>
          <TooltipProvider>
            <Nav />
            <main className="flex-1">{children}</main>
            <Footer />
            <Toaster position="bottom-right" />
          </TooltipProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
