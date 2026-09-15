import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, hasAdministrator, setupCodeRequired } from "@/lib/auth";
import { ensureSeed } from "@/lib/data";
import { AccessForm } from "./access-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Entrar · Cotiza",
  description: "Accede a tu espacio de cotizaciones.",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  try {
    if (await getSessionUser()) redirect("/");
    await ensureSeed();
    const configured = await hasAdministrator();
    return <AccessForm mode={configured ? "login" : "setup"} codeRequired={setupCodeRequired()} />;
  } catch (error) {
    console.error("Login page failed", error);
    throw error;
  }
}
