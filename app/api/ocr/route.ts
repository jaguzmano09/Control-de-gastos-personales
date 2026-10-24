import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractTransactionFromImage } from '@/lib/gemini/client'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Debes enviar un archivo de imagen.' }, { status: 400 })
  }
  if (!file.type.startsWith('image/')) {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo procesar el comprobante.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
