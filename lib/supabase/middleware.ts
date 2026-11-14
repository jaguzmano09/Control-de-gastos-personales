import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getCanonicalPageUrl } from "@/lib/site-origin"

const PUBLIC_PATHS = new Set(['/inicio', '/login', '/terminos', '/privacidad', '/seguridad', '/soporte'])
const PUBLIC_ASSET_PATHS = new Set(['/manifest.webmanifest', '/sw.js', '/offline.html'])

export async function updateSession(request: NextRequest) {
  const canonicalPage = getCanonicalPageUrl(request.url, request.method)
  if (canonicalPage) return NextResponse.redirect(canonicalPage, 307)

  // Public installation assets must remain available without a session or database access.
  if (PUBLIC_ASSET_PATHS.has(request.nextUrl.pathname)) {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => {
          items.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          items.forEach(({ name, value, options }) => response.cookies.set(name, value, options as never))
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  function redirectWithCookies(path: string) {
    const redirectResponse = NextResponse.redirect(new URL(path, request.url))
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie))
    return redirectResponse
  }

  const isPublicPath = PUBLIC_PATHS.has(request.nextUrl.pathname)

  if (!user && !isPublicPath && !request.nextUrl.pathname.startsWith('/api/')) {
    return redirectWithCookies(request.nextUrl.pathname === '/' ? '/inicio' : '/login')
  }

  if (user && request.nextUrl.pathname === '/login') {
    return redirectWithCookies('/')
  }

  // Terms and privacy acceptance is versioned in the database. Existing users
  // are guided through renewal before entering protected product routes.
  if (user && !isPublicPath && !request.nextUrl.pathname.startsWith('/api/') && request.nextUrl.pathname !== '/consentimiento') {
    const [{ data: activeDocuments, error: documentsError }, { data: acceptances, error: acceptancesError }] = await Promise.all([
      supabase.from('document_versions').select('id, document_key').eq('is_active', true),
      supabase.from('user_document_acceptances').select('document_version_id').eq('user_id', user.id),
    ])
    const documentKeys = new Set((activeDocuments ?? []).map((document) => document.document_key))
    if (documentsError || acceptancesError || !documentKeys.has('terms') || !documentKeys.has('privacy')) {
      return redirectWithCookies('/consentimiento?error=' + encodeURIComponent('No pudimos verificar los documentos vigentes. Inténtalo de nuevo más tarde.'))
    }
    const acceptedDocumentIds = new Set((acceptances ?? []).map((acceptance) => acceptance.document_version_id))
    const isMissingAcceptance = (activeDocuments ?? []).some((document) => !acceptedDocumentIds.has(document.id))

    if (isMissingAcceptance) {
      return redirectWithCookies('/consentimiento')
    }
  }

  return response
}
