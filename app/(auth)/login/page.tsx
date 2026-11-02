"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const { error: signInError } = await createClient().auth.signInWithPassword({ email, password });
    if (signInError) setError(signInError.message); else window.location.assign("/");
    setLoading(false);
  }
  return <section className="panel w-full max-w-md p-7 sm:p-9"><div className="mb-8"><p className="eyebrow">Control de gastos</p><h1 className="mt-3 font-serif text-4xl tracking-tight text-ledger-text">Bienvenido de nuevo</h1><p className="mt-2 text-sm leading-6 text-ledger-muted">Administra tus movimientos con una vista clara y tranquila.</p></div><form className="space-y-5" onSubmit={submit}><label className="block text-sm font-medium text-ledger-text">Correo<input className="input mt-2 min-h-12 w-full rounded-xl px-4" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label><label className="block text-sm font-medium text-ledger-text">Contraseña<input className="input mt-2 min-h-12 w-full rounded-xl px-4" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>{error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<button className="btn btn-primary btn-full min-h-12 rounded-xl" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button></form></section>;
}
