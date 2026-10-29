import type { Metadata } from "next";
import { Suspense } from "react";

import { LockForm } from "@/components/site/lock-form";
import { MyVaults } from "@/components/site/my-vaults";
import { PageHeader } from "@/components/site/page-header";
import { VaultStats } from "@/components/site/vault-stats";

export const metadata: Metadata = { title: "Vaults" };

export default function VaultsPage() {
  return (
    <>
      <PageHeader title="Your vaults" body="Lock tokens, watch your rewards build up, and claim them any time. On your unlock day, take everything back." />
      <section className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6">
        <VaultStats />
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-24">
            <Suspense>
              <LockForm />
            </Suspense>
          </div>
          <MyVaults />
        </div>
      </section>
    </>
  );
}
