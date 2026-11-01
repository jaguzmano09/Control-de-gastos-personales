import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildGoogleAuthUrl } from '@/lib/gmail/client'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL))

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