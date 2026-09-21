// Verifica el nombre del modelo contra la documentación vigente de Gemini
// antes de desplegar — los modelos cambian con el tiempo.
const GEMINI_MODEL = 'gemini-2.0-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

type Extracted = {
  occurred_at: string
  amount: number
  description: string
  suggested_category: string
  confidence: number
}

function buildPrompt(categoryNames: string[]) {
  return `Eres un asistente que extrae datos de un movimiento bancario o factura de Colombia.
Categorías disponibles: ${categoryNames.join(', ')}.
Devuelve SOLO un JSON con esta forma exacta, sin texto adicional ni markdown:
{"occurred_at":"YYYY-MM-DD","amount":number,"description":string,"suggested_category":string,"confidence":number}
"confidence" es tu nivel de seguridad (0 a 1) sobre la categoría sugerida.`
}

async function callGemini(parts: object[]): Promise<Extracted> {
  const res = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  })

  if (!res.ok) throw new Error(`Gemini error: ${res.status} ${await res.text()}`)

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini no devolvió contenido')

  return JSON.parse(text) as Extracted
}

export async function extractTransactionFromImage(base64Image: string, mimeType: string, categoryNames: string[]) {
  return callGemini([
    { text: buildPrompt(categoryNames) },
    { inline_data: { mime_type: mimeType, data: base64Image } },
  ])
}

export async function extractTransactionFromText(emailText: string, categoryNames: string[]) {
  return callGemini([
    { text: `${buildPrompt(categoryNames)}\n\nCorreo:\n${emailText}` },
  ])
}