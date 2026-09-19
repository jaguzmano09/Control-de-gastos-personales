"use client";

import { FormEvent, useMemo, useState } from "react";
import styles from "./page.module.css";

type ClassificationResponse = {
  category: string;
  confidence: number;
  reason?: string;
  savedInSupabase?: boolean;
  persistenceWarning?: string;
};

export default function Home() {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState<ClassificationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isValid = useMemo(() => {
    return description.trim().length > 0 && Number(amount) > 0;
  }, [amount, description]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid) {
      setError("Completa una descripción y un monto válido.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/classify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: description.trim(),
          amount: Number(amount),
          saveInSupabase: true,
        }),
      });

      const payload = (await response.json()) as ClassificationResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo clasificar el gasto.");
      }

      setResult(payload);
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Ocurrió un error inesperado.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.container}>
      <section className={styles.card}>
        <h1>Control de gastos personales</h1>
        <p>
          Clasifica tus gastos con Gemini y guárdalos en Supabase desde esta
          PWA.
        </p>

        <form className={styles.form} onSubmit={onSubmit}>
          <label className={styles.label}>
            Descripción
            <input
              className={styles.input}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ej: Supermercado semanal"
            />
          </label>

          <label className={styles.label}>
            Monto
            <input
              className={styles.input}
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
            />
          </label>

          <button className={styles.button} disabled={loading} type="submit">
            {loading ? "Clasificando..." : "Clasificar gasto"}
          </button>
        </form>

        {error ? <p className={styles.error}>{error}</p> : null}

        {result ? (
          <article className={styles.result}>
            <h2>Resultado</h2>
            <p>
              <strong>Categoría:</strong> {result.category}
            </p>
            <p>
              <strong>Confianza:</strong> {Math.round(result.confidence * 100)}%
            </p>
            {result.reason ? (
              <p>
                <strong>Motivo:</strong> {result.reason}
              </p>
            ) : null}
            <p>
              <strong>Supabase:</strong>{" "}
              {result.savedInSupabase ? "guardado" : "no guardado"}
            </p>
            {result.persistenceWarning ? (
              <p className={styles.warning}>{result.persistenceWarning}</p>
            ) : null}
          </article>
        ) : null}
      </section>
    </main>
  );
}
