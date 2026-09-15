import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";
import { Brand } from "@/components/ui";

export default function NotFound() {
  return <main className="standalone-state"><Brand /><FileQuestion size={42} color="#a7ba95" /><h1>Esta propuesta tomó otro camino.</h1><p>El enlace no existe o la cotización fue eliminada. Pide al emisor que te comparta un enlace actualizado.</p><Link className="button button-primary" href="/"><ArrowLeft size={16} />Ir al inicio</Link></main>;
}
