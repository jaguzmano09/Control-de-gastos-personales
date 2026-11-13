import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildGoogleAuthUrl } from '@/lib/gmail/client'
import { isGeminiPrivateDataProcessingApproved } from '@/lib/gemini/client'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL))
  if (!isGeminiPrivateDataProcessingApproved()) {
    return NextResponse.redirect(new URL('/correo?paused=1', request.url))
  }

  const state = randomBytes(32).toString('hex')
  const response = NextResponse.redirect(buildGoogleAuthUrl(state))

  response.cookies.set('gmail_oauth_state', state, {
    httpOnly: true,
    maxAge: 600,
    path: '/api/gmail',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  return response
}
