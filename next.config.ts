import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  // Programmable's launch review and wallets fetch the token image from the browser, so it must allow any origin.
  async headers() {
    return [
      {
        source: "/:file(token.png|avatar.png|logo-mark.png)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
