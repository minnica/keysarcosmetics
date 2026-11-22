import { indexable } from "@/lib/site";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: indexable },
};

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <article className="max-w-3xl space-y-4 leading-7 [&_a]:underline [&_a]:underline-offset-4 [&_h1]:font-title [&_h1]:text-3xl [&_h1]:leading-tight [&_h1]:text-keysar-dark sm:[&_h1]:text-5xl [&_h2]:pt-4 [&_h2]:font-title [&_h2]:text-xl">
      {children}
    </article>
  );
}
