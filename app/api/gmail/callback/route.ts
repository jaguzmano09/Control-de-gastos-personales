import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens, getProfile } from '@/lib/gmail/client'
import { timingSafeEqual } from 'node:crypto'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const storedState = request.cookies.get('gmail_oauth_state')?.value
  const clearStateCookie = (response: NextResponse) => {
    response.cookies.set('gmail_oauth_state', '', {
      expires: new Date(0),
      httpOnly: true,
      path: '/api/gmail',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
    return response
  }

  if (!code || !state || !storedState || !safeEqual(state, storedState)) {
    return clearStateCookie(
      NextResponse.redirect(new URL('/correo?error=Estado+OAuth+inv%C3%A1lido+o+expirado', request.url))
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return clearStateCookie(NextResponse.redirect(new URL('/login', request.url)))
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    if (!tokens.refresh_token) {
      return clearStateCookie(NextResponse.redirect(
        new URL('/correo?error=No+se+recibi%C3%B3+refresh_token%2C+revoca+el+acceso+en+Google+y+reintenta', request.url)
      ))
    }

    const profile = await getProfile(tokens.access_token)
    const serviceRoleSupabase = createServiceRoleClient()

    const { error } = await serviceRoleSupabase.from('gmail_connections').upsert(
      {
        user_id: user.id,
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        gmail_history_id: profile.historyId,
        is_active: true,
      },
      { onConflict: 'user_id' }
    )
    if (error) throw error

    return clearStateCookie(NextResponse.redirect(new URL('/correo?connected=true', request.url)))
  } catch {
    console.error('Gmail OAuth callback failed')
    return clearStateCookie(
      NextResponse.redirect(new URL('/correo?error=No+se+pudo+conectar+Gmail', request.url))
    )
  }
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}
