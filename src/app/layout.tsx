import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./refinements.css";
import "./theme.css";

export const metadata: Metadata = {
  title: "Cotiza · Menos papeleo. Más posibilidades.",
  description: "Crea cotizaciones profesionales, administra tus clientes y comparte tus propuestas por WhatsApp o correo. Tu próximo gran proyecto empieza en Cotiza.",
  applicationName: "Cotiza",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="es" suppressHydrationWarning>
    <head>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var m=localStorage.getItem('cotiza-theme-mode')==='dark'?'dark':'light';var a=localStorage.getItem('cotiza-theme-accent')||'green';document.documentElement.dataset.theme=m;document.documentElement.dataset.accent=a;}catch(e){}})();`,
        }}
      />
    </head>
    <body>{children}</body>
  </html>;
}
