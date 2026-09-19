type ExpenseCategory =
  | "alimentacion"
  | "transporte"
  | "vivienda"
  | "salud"
  | "entretenimiento"
  | "servicios"
  | "otros";

export type ExpenseClassification = {
  category: ExpenseCategory;
  confidence: number;
  reason: string;
};

function extractJsonBlock(input: string): string | null {
  const start = input.indexOf("{");
  const end = input.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return input.slice(start, end + 1);
}

function normalizeCategory(category: string): ExpenseCategory {
  const normalized = category.toLowerCase().trim();
  const validCategories: ExpenseCategory[] = [
    "alimentacion",
    "transporte",
    "vivienda",
    "salud",
    "entretenimiento",
    "servicios",
    "otros",
  ];

  return validCategories.includes(normalized as ExpenseCategory)
    ? (normalized as ExpenseCategory)
    : "otros";
}

function fallbackClassification(
  description: string,
  amount: number,
): ExpenseClassification {
  const text = description.toLowerCase();

  if (/(uber|taxi|bus|metro|gasolina)/.test(text)) {
    return { category: "transporte", confidence: 0.72, reason: "Reglas locales" };
  }

  if (/(farmacia|hospital|consulta|medic)/.test(text)) {
    return { category: "salud", confidence: 0.7, reason: "Reglas locales" };
  }

  if (/(luz|agua|internet|telefono|electricidad)/.test(text)) {
    return { category: "servicios", confidence: 0.74, reason: "Reglas locales" };
  }

  if (amount > 500) {
    return { category: "vivienda", confidence: 0.55, reason: "Reglas locales" };
  }

  return { category: "otros", confidence: 0.5, reason: "Clasificación por defecto" };
}

export async function classifyExpenseWithGemini(
  description: string,
  amount: number,
): Promise<ExpenseClassification> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return fallbackClassification(description, amount);
  }

  const prompt = `Clasifica este gasto en una de estas categorías: alimentacion, transporte, vivienda, salud, entretenimiento, servicios, otros.
Devuelve SOLO JSON con shape: {"category":"...", "confidence":0-1, "reason":"..."}.
Descripción: ${description}
Monto: ${amount}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    return fallbackClassification(description, amount);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const jsonBlock = extractJsonBlock(text);

  if (!jsonBlock) {
    return fallbackClassification(description, amount);
  }

  try {
    const parsed = JSON.parse(jsonBlock) as {
      category?: string;
      confidence?: number;
      reason?: string;
    };

    return {
      category: normalizeCategory(parsed.category ?? "otros"),
      confidence:
        typeof parsed.confidence === "number" &&
        parsed.confidence >= 0 &&
        parsed.confidence <= 1
          ? parsed.confidence
          : 0.5,
      reason: parsed.reason?.toString().slice(0, 180) ?? "Sin motivo",
    };
  } catch {
    return fallbackClassification(description, amount);
  }
}
