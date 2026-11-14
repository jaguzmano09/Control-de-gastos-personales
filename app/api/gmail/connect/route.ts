import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildGoogleAuthUrl } from '@/lib/gmail/client'
import { isGeminiPrivateDataProcessingApproved } from '@/lib/gemini/client'
import { getTrustedSiteOrigin } from '@/lib/site-origin'

export async function GET(request: Request) {
  const origin = getTrustedSiteOrigin(request.url)
  if (!origin) return new Response('Unsupported site origin', { status: 400 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', origin))
  if (!isGeminiPrivateDataProcessingApproved()) {
    return NextResponse.redirect(new URL('/correo?paused=1', request.url))
  }

  const state = randomBytes(32).toString('hex')
  const response = NextResponse.redirect(buildGoogleAuthUrl(state, `${origin}/api/gmail/callback`))

  response.cookies.set('gmail_oauth_state', state, {
    httpOnly: true,
    maxAge: 600,
    path: '/api/gmail',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  return response
}
