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
  return <section className="panel w-full max-w-md p-8"><p className="mb-2 text-sm uppercase tracking-[.2em] text-moss">Control personal</p><h1 className="mb-8 text-4xl">Iniciar sesión</h1><form className="space-y-4" onSubmit={submit}><label className="block text-sm">Correo<input className="mt-1 w-full border border-stone-300 bg-white p-3" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label><label className="block text-sm">Contraseña<input className="mt-1 w-full border border-stone-300 bg-white p-3" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>{error && <p className="text-sm text-red-700">{error}</p>}<button className="w-full bg-ink p-3 text-white disabled:opacity-50" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button></form></section>;
}
