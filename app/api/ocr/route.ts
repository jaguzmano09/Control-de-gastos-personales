import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractTransactionFromImage, isGeminiPrivateDataProcessingApproved, isUsableExtraction } from '@/lib/gemini/client'
import { matchesImageSignature } from '@/lib/ocr/image-signature'
import { validateReceiptImage } from '@/lib/ocr/preprocess'

export const maxDuration = 60

const MAX_OCR_UPLOAD_BYTES = 4 * 1024 * 1024

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > 4.5 * 1024 * 1024) {
    return NextResponse.json({ error: 'La solicitud supera el tamaño máximo permitido.' }, { status: 413 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'La solicitud no contiene un formulario válido.' }, { status: 400 })
  }
  if (formData.get('allow_external_processing') !== 'on' || !isGeminiPrivateDataProcessingApproved()) {
    return NextResponse.json({ error: 'El procesamiento externo requiere autorización explícita y disponibilidad aprobada.' }, { status: 403 })
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Debes enviar un archivo de imagen.' }, { status: 400 })
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return NextResponse.json({ error: 'El archivo debe ser una imagen.' }, { status: 400 })
  }
  if (file.size > MAX_OCR_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'La imagen debe pesar menos de 4 MB. Puedes comprimirla o elegir una versión más pequeña.' }, { status: 413 })
  }

  const bytes = await file.arrayBuffer()
  if (!matchesImageSignature(new Uint8Array(bytes), file.type)) {
    return NextResponse.json({ error: 'El contenido no corresponde al tipo de imagen seleccionado.' }, { status: 400 })
  }
  try {
    await validateReceiptImage(Buffer.from(bytes), file.type)
  } catch {
    return NextResponse.json({ error: 'La imagen está dañada o supera el límite de resolución permitido.' }, { status: 400 })
  }
  const { data: allowed, error: quotaError } = await supabase.rpc('consume_ocr_quota')
  if (quotaError) return NextResponse.json({ error: 'No pudimos verificar el límite de procesamiento. Inténtalo más tarde.' }, { status: 503 })
  if (!allowed) return NextResponse.json({ error: 'Alcanzaste el límite de comprobantes. Inténtalo de nuevo más tarde.' }, { status: 429 })

  try {
    const result = await extractTransactionFromImage(
      Buffer.from(bytes).toString('base64'),
      file.type,
      [],
    )
    if (!isUsableExtraction(result)) return NextResponse.json({ error: 'No se pudo leer el comprobante con suficiente información.' }, { status: 422 })
    return NextResponse.json(result)
  } catch {
    console.error('Receipt OCR provider request failed')
    return NextResponse.json({ error: 'No se pudo procesar el comprobante. Inténtalo de nuevo más tarde.' }, { status: 502 })
  }
}
