import { notFound } from "next/navigation";
import { getThankYouCard } from "@/lib/data";
import { ThankYouCard } from "@/components/thank-you-card";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gracias por tu compra · Cotiza", robots: { index: false, follow: false } };

export default async function ThankYouPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getThankYouCard(token);
  if (!data) notFound();
  return <ThankYouCard {...data} />;
}
