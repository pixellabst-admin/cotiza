import type { Metadata } from "next";
import Link from "next/link";
import { existsSync } from "node:fs";
import path from "node:path";
import { ArrowLeft, ArrowUpRight, Download, Laptop, Monitor, ShieldCheck, Terminal } from "lucide-react";
import { redirect } from "next/navigation";
import { Brand } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Cotiza en tu computadora · Instalación local",
  description: "Descarga Cotiza y aprende a abrirla en tu computadora con Windows, macOS o Linux.",
  robots: { index: false, follow: false },
};

export default async function InstallPage() {
  if (!(await getSessionUser())) redirect("/login");
  const hasDownload = existsSync(path.join(process.cwd(), "public", "descargas", "cotiza-local.zip"));
  return <div className={styles.page}>
    <header className={styles.header}><Link href="/" aria-label="Inicio de Cotiza"><Brand small /></Link><Link href="/" className={styles.back}><ArrowLeft size={15} />Volver a Cotiza</Link></header>
    <main className={styles.main}>
      <section className={styles.intro}>
        <span className={styles.eyebrow}><Laptop size={15} />TU ESPACIO, EN TU COMPUTADORA</span>
        <h1>Cotiza, donde tú trabajas.</h1>
        <p>Descarga el proyecto, prepáralo una vez y abre tu negocio en <strong>localhost</strong>. Te acompañamos paso a paso.</p>
        <div className={styles.actions}>{hasDownload && <a className="button button-primary" href="/descargas/cotiza-local.zip" download="cotiza-local.zip"><Download size={17} />Descargar proyecto ZIP</a>}<Link className="button button-secondary" href="/">Solo quiero ver la aplicación<ArrowUpRight size={16} /></Link></div>
        <p className={styles.caption}>{hasDownload ? "Código completo · Guía en español · Sin contraseñas ni datos privados" : "Esta copia no incluye otro ZIP. Si ya tienes la carpeta del proyecto, sigue desde el paso 2."}</p>
      </section>
      <div className={styles.steps}>
        <section className={styles.step}><span className={styles.number}>01</span><div><h2>Descarga y extrae el proyecto</h2><p>Descarga el ZIP y elige <strong>Extraer todo</strong> en Windows, o haz doble clic en él en macOS. Abre la carpeta <strong>cotiza</strong> que contiene <code>package.json</code> y <code>README.md</code>.</p><p className={styles.hint}>No ejecutes los archivos desde dentro del ZIP. Primero descomprímelo. Abre <strong>LEEME-PRIMERO.txt</strong> con doble clic para seguir estos pasos desde tu computadora.</p></div></section>
        <section className={styles.step}><span className={styles.number}>02</span><div><h2>Instala estas dos herramientas</h2><p>Solo necesitas hacerlo una vez. Instala Node.js 22 o superior y Docker Desktop. Después <strong>abre Docker Desktop</strong> y espera a que esté listo.</p><div className={styles.requirements}><a href="https://nodejs.org/" target="_blank" rel="noreferrer"><span>Node.js<small>Versión 22 o superior · Incluye npm</small></span><ArrowUpRight size={17} /></a><a href="https://www.docker.com/products/docker-desktop/" target="_blank" rel="noreferrer"><span>Docker Desktop<small>Mantiene tu base de datos local</small></span><ArrowUpRight size={17} /></a></div><p className={styles.hint}>En Linux puedes usar Docker Engine con Docker Compose. La primera instalación necesita Internet.</p></div></section>
        <section className={styles.step}><span className={styles.number}>03</span><div><h2>Inicia Cotiza</h2><p>Los archivos de inicio preparan la configuración, instalan las dependencias que falten y arrancan la base de datos y la aplicación.</p><div className={styles.systems}><div><h3><Monitor size={17} />Windows</h3><p>Dentro de la carpeta descomprimida, haz doble clic en:</p><code className={styles.command}>INICIAR-WINDOWS.cmd</code><p className={styles.hint}>Se abrirá una ventana con el progreso. No necesitas permisos de administrador.</p></div><div><h3><Terminal size={17} />macOS o Linux</h3><p>Abre una terminal en la carpeta del proyecto y ejecuta:</p><code className={styles.command}>bash iniciar-local.sh</code><p className={styles.hint}>También puedes abrir la carpeta en VS Code y elegir Terminal → Nueva terminal.</p></div></div></div></section>
        <section className={styles.step}><span className={styles.number}>04</span><div><h2>Abre tu navegador</h2><p>Espera a que la terminal muestre <strong>Ready</strong> y escribe esta dirección en Chrome, Edge, Safari o Firefox:</p><code className={styles.address}>http://localhost:3000</code><p><strong>Esta dirección no abrirá antes de iniciar la aplicación.</strong> Mantén la terminal y Docker abiertos mientras uses Cotiza. Si el puerto 3000 está ocupado, abre la dirección que indique la terminal.</p><p className={styles.hint}>Entra en Configuración para poner los datos de tu negocio. Para cerrar la aplicación, pulsa Ctrl + C en la terminal.</p></div></section>
      </div>
      <aside className={styles.notice}><ShieldCheck size={23} /><div><h2>Local significa: solo en tu computadora.</h2><p>Tu instalación empieza con datos de ejemplo; no copia los datos de la vista previa. Los enlaces de localhost no funcionan para tus clientes: comparte el PDF mientras trabajas localmente.</p><p>Esta versión no tiene inicio de sesión para el administrador. No expongas el panel a Internet sin añadir protección de acceso.</p></div></aside>
      <section className={styles.faq}><h2>Para la próxima vez</h2><p>Abre Docker Desktop y vuelve a ejecutar el mismo archivo de inicio. Tus datos permanecen guardados. No elimines el volumen de Docker ni el archivo <code>.env.local</code>.</p><details><summary>¿Ya tengo PostgreSQL o quiero hacerlo manualmente?</summary><p>Sigue la opción manual de <strong>README.md</strong>, incluida en el ZIP. Allí encontrarás la conexión personalizada, los comandos individuales y soluciones a los errores más comunes.</p></details><details><summary>¿Solo quiero ver la aplicación, sin instalar nada?</summary><p>Usa el botón <strong>Solo quiero ver la aplicación</strong> de esta página. En la vista previa abrirá Cotiza en línea; eso no instala nada en tu computadora.</p></details></section>
      <section className={styles.faq} id="base-de-datos" aria-labelledby="database-guide-title">
        <h2 id="database-guide-title">Ver la base de datos y sus tablas</h2>
        <p>Cuando ya tengas Cotiza instalada en tu computadora, puedes consultar sus registros con <strong>Drizzle Studio</strong>. Está incluido en el proyecto: no necesitas instalar otro programa.</p>
        <ol>
          <li><p><strong>1. Abre Docker Desktop</strong> y espera a que inicie.</p></li>
          <li><p><strong>2. Abre una segunda terminal en la carpeta cotiza.</strong> En Windows, abre esa carpeta en el Explorador, escribe <code>cmd</code> en la barra de la ruta y pulsa Enter. No cierres la terminal donde está funcionando la aplicación.</p></li>
          <li><p><strong>3. Inicia la base si usas el Docker incluido:</strong><br /><code>docker compose --env-file .env.local up -d --wait</code></p></li>
          <li><p><strong>4. Inicia el visor:</strong><br /><code>npx drizzle-kit studio --host=127.0.0.1 --port=4983</code></p></li>
          <li><p><strong>5. Abre</strong> <a className="text-button" href="https://local.drizzle.studio" target="_blank" rel="noreferrer">https://local.drizzle.studio<ArrowUpRight size={13} /></a> en Chrome o Edge y selecciona una tabla del esquema <code>public</code>. Mantén la terminal de Studio abierta.</p></li>
        </ol>
        <p><strong>customers</strong>: clientes. <strong>quotes</strong>: cotizaciones. <strong>business_settings</strong>: información de tu negocio. Los conceptos están en <code>quotes.items</code>, y los campos que terminan en <code>_cents</code> expresan importes en centavos.</p>
        <p>El visor usa tu conexión local automáticamente. La base de tu computadora y la de esta vista previa son independientes. Si prefieres pgAdmin o DBeaver, consulta <strong>BASE-DE-DATOS.md</strong>, incluido en la descarga.</p>
        <p><strong>Studio no es de solo lectura:</strong> evita editar o borrar registros si solo quieres consultarlos. No expongas su puerto a Internet. Para cerrar el visor, pulsa Ctrl + C en su terminal.</p>
      </section>
      <section className={styles.faq} id="publicar-web" aria-labelledby="web-guide-title">
        <h2 id="web-guide-title">Usar Cotiza por Internet</h2>
        <p>Para abrirla desde cualquier computadora o celular sin mantener tu equipo encendido, recomendamos <strong>Vercel para la aplicación</strong> y <strong>Neon para PostgreSQL</strong>. El código se guarda en un repositorio privado de GitHub. No necesitas Docker en esos servicios.</p>
        <div className={styles.requirements}>
          <a href="https://vercel.com/" target="_blank" rel="noreferrer"><span>Vercel<small>Alojamiento de Next.js y dirección web</small></span><ArrowUpRight size={17} /></a>
          <a href="https://neon.com/" target="_blank" rel="noreferrer"><span>Neon<small>PostgreSQL administrado en la nube</small></span><ArrowUpRight size={17} /></a>
        </div>
        <aside className={styles.notice}><ShieldCheck size={23} /><div><h2>Primero, protege tu negocio.</h2><p><strong>Esta versión todavía no tiene inicio de sesión para el administrador.</strong> No la publiques con datos reales sin proteger tanto el panel como sus APIs. Un dominio y HTTPS no impiden que otros modifiquen esos datos.</p><p>Para uso privado puedes configurar y verificar <strong>Vercel Authentication → All Deployments</strong>, incluyendo producción. Esa protección también restringe los enlaces de clientes: mientras la uses, comparte el PDF. Para permitir propuestas públicas por enlace hay que añadir login propio y autorización en el servidor.</p></div></aside>
        <ol>
          <li><p><strong>1. Prepara GitHub.</strong> Sube el proyecto a un repositorio privado. No incluyas archivos .env, contraseñas, copias de la base, node_modules ni .next.</p></li>
          <li><p><strong>2. Crea PostgreSQL en Neon.</strong> Guarda su conexión privada. Usa bases separadas para pruebas y producción; la conexión de Docker de tu computadora no funciona desde Vercel.</p></li>
          <li><p><strong>3. Prepara las tablas en una base nueva.</strong> Sigue PUBLICAR-WEB.md para utilizar <code>drizzle.web.config.ts</code> sin cambiar tu conexión local. No apliques cambios a una base con datos reales sin respaldo y revisión.</p></li>
          <li><p><strong>4. Importa el repositorio en Vercel.</strong> Selecciona Next.js, configura <code>DATABASE_URL</code> con la conexión de Neon y verifica la protección de todos los despliegues antes de usar datos reales.</p></li>
          <li><p><strong>5. Despliega y comprueba.</strong> Vercel compila con <code>npm run build</code> y entrega una dirección de proyecto. Prueba el acceso, el guardado y el PDF. Puedes añadir un dominio propio después.</p></li>
        </ol>
        <p><strong>Costos:</strong> revisa los planes y límites vigentes. Vercel Hobby es para uso personal no comercial; para un negocio necesitas un plan compatible con uso comercial. El dominio propio es opcional y los respaldos de PostgreSQL deben quedar configurados.</p>
        <p><strong>¿Quieres los pasos exactos?</strong> Abre <strong>SUBIR-A-INTERNET.txt</strong>, incluido en el ZIP. Trae los comandos de Git, dónde pulsar en Neon y cómo configurar Vercel, en tres partes numeradas. Antes de subir, ejecuta <code>node scripts/revisar-antes-de-subir.mjs</code> para comprobar que ninguna contraseña quede incluida en el envío.</p>
        <p><strong>Para publicar tus cambios más adelante</strong>, usa el actualizador. Guárdalo dentro de la carpeta del proyecto, junto a <code>package.json</code>:</p>
        <div className={styles.requirements}>
          <a href="/descargas/ACTUALIZAR-GITHUB.bat" download><span>ACTUALIZAR-GITHUB.bat<small>Windows · doble clic para subir tus cambios</small></span><Download size={17} /></a>
          <a href="/descargas/actualizar.sh" download><span>actualizar.sh<small>macOS y Linux · bash actualizar.sh</small></span><Download size={17} /></a>
        </div>
        <p className={styles.hint}>El actualizador necesita el resto del proyecto para funcionar: descarga primero el ZIP completo. Ambos archivos ya vienen incluidos dentro de él.</p>
        <p>Los detalles técnicos y de seguridad están en <strong>PUBLICAR-WEB.md</strong>. No hemos creado cuentas ni realizado un despliegue en tus servicios. Subir el código no transfiere automáticamente los datos que guardaste localmente y no activa envíos automáticos por WhatsApp o correo.</p>
      </section>
      <footer className={styles.footer}>Menos papeleo. Más posibilidades.<Brand small /></footer>
    </main>
  </div>;
}
