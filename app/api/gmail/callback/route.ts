import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens, getProfile } from '@/lib/gmail/client'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const userId = request.nextUrl.searchParams.get('state')

  if (!code || !userId) {
    return NextResponse.redirect(new URL('/correo?error=Falta+informaci%C3%B3n+de+Google', request.url))
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        new URL('/correo?error=No+se+recibi%C3%B3+refresh_token%2C+revoca+el+acceso+en+Google+y+reintenta', request.url)
      )
    }

    const profile = await getProfile(tokens.access_token)
    const supabase = createServiceRoleClient()

    const { error } = await supabase.from('gmail_connections').upsert(
      {
        user_id: userId,
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        gmail_history_id: profile.historyId,
        is_active: true,
      },
      { onConflict: 'user_id' }
    )
    if (error) throw error

    return NextResponse.redirect(new URL('/correo?connected=true', request.url))
  } catch (err) {
    return NextResponse.redirect(new URL('/correo?error=' + encodeURIComponent((err as Error).message), request.url))
  }
}