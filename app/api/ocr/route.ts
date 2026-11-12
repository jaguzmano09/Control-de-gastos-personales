import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractTransactionFromImage } from '@/lib/gemini/client'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > 11 * 1024 * 1024) {
    return NextResponse.json({ error: 'La imagen no puede superar los 10 MB.' }, { status: 413 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'La solicitud no contiene un formulario válido.' }, { status: 400 })
  }
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Debes enviar un archivo de imagen.' }, { status: 400 })
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return NextResponse.json({ error: 'El archivo debe ser una imagen.' }, { status: 400 })
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'La imagen no puede superar los 10 MB.' }, { status: 413 })
  }

  const [{ data: categories, error: categoriesError }, bytes] = await Promise.all([
    supabase.from('categories').select('name').eq('is_active', true),
    file.arrayBuffer(),
  ])
  if (categoriesError) {
    return NextResponse.json({ error: 'No se pudieron cargar las categorías.' }, { status: 500 })
  }

  try {
    const result = await extractTransactionFromImage(
      Buffer.from(bytes).toString('base64'),
      file.type,
      (categories ?? []).map((category) => category.name),
    )
    return NextResponse.json(result)
  } catch {
    console.error('Receipt OCR provider request failed')
    return NextResponse.json({ error: 'No se pudo procesar el comprobante. Inténtalo de nuevo más tarde.' }, { status: 502 })
  }
}
