// Verifica el nombre del modelo contra la documentación vigente de Gemini
// antes de desplegar — los modelos cambian con el tiempo.
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

type Extracted = {
  occurred_at: string
  amount: number
  description: string
  suggested_category: string
  confidence: number
}

function buildPrompt(categoryNames: string[], ocrText?: string) {
  const ocrContext = ocrText
    ? `\nTexto extraído previamente por OCR. Úsalo como fuente principal y corrige errores evidentes de lectura:\n${ocrText}\n`
    : ''

  return `Eres un asistente que extrae datos de un movimiento bancario o factura de Colombia.
Categorías disponibles: ${categoryNames.join(', ')}.
${ocrContext}
Devuelve SOLO un JSON con esta forma exacta, sin texto adicional ni markdown:
{"occurred_at":"YYYY-MM-DD","amount":number,"description":string,"suggested_category":string,"confidence":number}
"confidence" es tu nivel de seguridad (0 a 1) sobre la categoría sugerida.
El monto debe ser el total final de la factura, sin símbolos ni separadores de miles.
Si no puedes determinar un campo con seguridad, usa una cadena vacía para texto o 0 para números.`
}

async function callGemini(parts: object[]): Promise<Extracted> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY no está configurada')
  }

  const request = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, request)

    if (res.ok) {
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error('Gemini no devolvió contenido')
      try {
        return JSON.parse(text) as Extracted
      } catch {
        throw new Error('Gemini devolvió una respuesta con formato inválido')
      }
    }

    const errorText = await res.text()
    if (res.status !== 429 && res.status !== 503) {
      throw new Error(`Gemini error: ${res.status} ${errorText}`)
    }

    if (attempt < 2) {
      const retryAfter = Number(res.headers.get('retry-after'))
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 1000
      await new Promise((resolve) => setTimeout(resolve, delay))
    } else {
      throw new Error(`Gemini error: ${res.status} ${errorText}`)
    }
  }

  throw new Error('Gemini no respondió después de varios intentos')
}

export async function extractTransactionFromImage(base64Image: string, mimeType: string, categoryNames: string[]) {
  return callGemini([
    { text: buildPrompt(categoryNames) },
    { inlineData: { mimeType, data: base64Image } },
  ])
}

export async function extractTransactionFromOcrText(ocrText: string, categoryNames: string[]) {
  return callGemini([
    { text: buildPrompt(categoryNames, ocrText) },
  ])
}

export async function extractTransactionFromImageWithOcr(
  base64Image: string,
  mimeType: string,
  ocrText: string,
  categoryNames: string[],
) {
  return callGemini([
    { text: buildPrompt(categoryNames, ocrText) },
    { inlineData: { mimeType, data: base64Image } },
  ])
}

export async function extractTransactionFromText(emailText: string, categoryNames: string[]) {
  return callGemini([
    { text: `${buildPrompt(categoryNames)}\n\nCorreo:\n${emailText}` },
  ])
}