import { redirect } from "next/navigation";
import { getAppData } from "@/lib/data";
import { getSessionUser } from "@/lib/auth";
import { Workspace } from "@/components/workspace";
import type { View } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const [data, params] = await Promise.all([getAppData(), searchParams]);
  const allowed = ["dashboard", "quotes", "customers", "reports", "settings"];
  const initialView = allowed.includes(params.view ?? "") ? params.view as View : "dashboard";
  return <Workspace initialData={data} initialView={initialView} user={user} />;
}
