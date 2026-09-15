"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import { Brand } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="standalone-state">
      <Brand />
      <AlertCircle size={38} color="#a7ba95" />
      <h1>Hagamos un nuevo intento.</h1>
      <p>No pudimos cargar tu espacio en este momento. Tus propuestas siguen guardadas.</p>
      <p>Si esto te aparece en <strong>Vercel</strong>, hay que subir la versión corregida a GitHub con <strong>ACTUALIZAR-GITHUB.bat</strong> (lee <strong>ACTUALIZAR-EN-VERCEL.txt</strong>). La vista previa local no actualiza tu sitio publicado.</p>
      <p>Si lo estás viendo en tu computadora, cierra Cotiza y vuelve a abrir el archivo de inicio.</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <button className="button button-primary" onClick={reset}><RotateCcw size={16} />Volver a intentar</button>
        <a className="button button-secondary" href="/login">Ir a iniciar sesión</a>
      </div>
    </main>
  );
}
