import type { Metadata } from "next";

import { FaqList } from "@/components/site/faq-list";
import { PageHeader } from "@/components/site/page-header";

export const metadata: Metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <>
      <PageHeader title="Questions" body="Short answers about locking, rewards, the token and safety." />
      <section className="mx-auto max-w-3xl px-4 sm:px-6">
        <FaqList grouped />
      </section>
    </>
  );
}
