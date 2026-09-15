"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, KeyRound, LoaderCircle, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { Brand } from "@/components/ui";
import styles from "./page.module.css";

export function AccessForm({ mode, codeRequired }: { mode: "login" | "setup"; codeRequired: boolean }) {
  const isSetup = mode === "setup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isSetup ? { action: "setup", email, password, name, setupCode } : { action: "login", email, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No pudimos completar la operación");
      window.location.assign("/");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "No pudimos completar la operación");
      setBusy(false);
    }
  }

  return <div className={styles.page}>
    <main className={styles.card}>
      <header className={styles.header}>
        <Brand />
        <span className={styles.eyebrow}>{isSetup ? <><Sparkles size={14} />PRIMER ACCESO</> : <><KeyRound size={14} />TU ESPACIO DE TRABAJO</>}</span>
        <h1>{isSetup ? "Crea tu acceso." : "Qué gusto verte."}</h1>
        <p>{isSetup ? "Define el correo y la contraseña con los que administrarás tus cotizaciones." : "Entra para continuar con tus cotizaciones y clientes."}</p>
      </header>

      {isSetup && !codeRequired && <div className={styles.warning} role="alert">
        <ShieldAlert size={19} />
        <span><strong>Nadie administra este espacio todavía.</strong> Si esta dirección es pública, cualquier persona que llegue antes que tú podría crear el acceso. Antes de publicar, define la variable <code>ADMIN_SETUP_CODE</code> en tu servicio de alojamiento.</span>
      </div>}

      <form onSubmit={submit} className={styles.form}>
        {isSetup && <label className="form-field">Tu nombre
          <input required minLength={2} maxLength={180} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Alejandro Morales" />
        </label>}

        <label className="form-field">Correo electrónico
          <input required type="email" maxLength={240} autoComplete={isSetup ? "email" : "username"} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="hola@tunegocio.com" />
        </label>

        <label className="form-field">Contraseña
          <span className={styles.passwordField}>
            <input required type={visible ? "text" : "password"} minLength={isSetup ? 10 : 1} maxLength={200}
              autoComplete={isSetup ? "new-password" : "current-password"} value={password}
              onChange={(event) => setPassword(event.target.value)} placeholder={isSetup ? "Al menos 10 caracteres" : "Tu contraseña"} />
            <button type="button" className="icon-button" onClick={() => setVisible(!visible)} aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}>
              {visible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </span>
          {isSetup && <span className="field-help">Guárdala en un lugar seguro. No hay recuperación automática por correo.</span>}
        </label>

        {isSetup && codeRequired && <label className="form-field">Código de instalación
          <input required maxLength={200} value={setupCode} onChange={(event) => setSetupCode(event.target.value)} placeholder="El valor de ADMIN_SETUP_CODE" autoComplete="off" />
          <span className="field-help">Es el valor que configuraste en tu servicio de alojamiento.</span>
        </label>}

        {error && <div className="form-error" role="alert">{error}</div>}

        <button className="button button-primary" disabled={busy}>
          {busy ? <LoaderCircle size={17} className="spin" /> : <ArrowRight size={17} />}
          {isSetup ? "Crear acceso y entrar" : "Entrar"}
        </button>
      </form>

      <footer className={styles.footer}>
        <ShieldCheck size={14} />
        <span>{isSetup ? "Tu contraseña se guarda cifrada, nunca en texto plano." : "Tu sesión se cierra automáticamente tras 12 horas."}</span>
      </footer>
    </main>
    <p className={styles.note}>Las cotizaciones que compartes con tus clientes siguen abriéndose con su enlace, sin necesidad de iniciar sesión.</p>
  </div>;
}
