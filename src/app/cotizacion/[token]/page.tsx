import { notFound } from "next/navigation";
import { getPublicQuote } from "@/lib/data";
import { PublicQuote } from "@/components/public-quote";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu cotización · Cotiza", robots: { index: false, follow: false } };

export default async function SharedQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getPublicQuote(token);
  if (!data) notFound();
  return <PublicQuote {...data} />;
}
