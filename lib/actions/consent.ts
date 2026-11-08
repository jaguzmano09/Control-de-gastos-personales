'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function acceptCurrentDocuments() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.rpc('accept_current_documents')
  if (error) {
    redirect(`/consentimiento?error=${encodeURIComponent('No pudimos registrar tu aceptación. Inténtalo de nuevo.')}`)
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
