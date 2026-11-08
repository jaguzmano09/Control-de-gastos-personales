import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

type CookieToSet = { name: string; value: string; options?: Parameters<typeof NextResponse.next>[0] }

const PUBLIC_PATHS = new Set(['/login', '/terminos', '/privacidad', '/seguridad', '/soporte'])

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items: CookieToSet[]) => {
          items.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          items.forEach(({ name, value, options }) => response.cookies.set(name, value, options as never))
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  const isPublicPath = PUBLIC_PATHS.has(request.nextUrl.pathname)

  if (!user && !isPublicPath && !request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Terms and privacy acceptance is versioned in the database. Existing users
  // are guided through renewal before entering protected product routes.
  if (user && !isPublicPath && !request.nextUrl.pathname.startsWith('/api/') && request.nextUrl.pathname !== '/consentimiento') {
    const [{ data: activeDocuments }, { data: acceptances }] = await Promise.all([
      supabase.from('document_versions').select('id').eq('is_active', true),
      supabase.from('user_document_acceptances').select('document_version_id').eq('user_id', user.id),
    ])
    const acceptedDocumentIds = new Set((acceptances ?? []).map((acceptance) => acceptance.document_version_id))
    const isMissingAcceptance = (activeDocuments ?? []).some((document) => !acceptedDocumentIds.has(document.id))

    if (isMissingAcceptance) {
      return NextResponse.redirect(new URL('/consentimiento', request.url))
    }
  }

  return response
}
