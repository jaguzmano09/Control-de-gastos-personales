const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

interface GmailMessagePart {
  mimeType?: string
  body?: { data?: string }
  parts?: GmailMessagePart[]
  headers?: { name: string; value: string }[]
}

interface GmailMessage {
  payload?: GmailMessagePart
}

export function buildGoogleAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI!,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent', // Request a refresh token when the user authorizes the connection.
    state,
  })
  return `${GOOGLE_OAUTH_URL}?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`Error obteniendo tokens: ${await res.text()}`)
  return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number }>
}

export async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Error refrescando token: ${await res.text()}`)
  return res.json() as Promise<{ access_token: string; expires_in: number }>
}

export async function getProfile(accessToken: string) {
  const res = await fetch(`${GMAIL_API_BASE}/profile`, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) throw new Error(`Error obteniendo perfil: ${await res.text()}`)
  return res.json() as Promise<{ historyId: string }>
}

export async function listHistory(accessToken: string, startHistoryId: string) {
  const res = await fetch(`${GMAIL_API_BASE}/history?startHistoryId=${startHistoryId}&historyTypes=messageAdded`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Error listando history: ${await res.text()}`)
  return res.json()
}

export async function getMessage(accessToken: string, messageId: string) {
  const res = await fetch(`${GMAIL_API_BASE}/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Error obteniendo mensaje: ${await res.text()}`)
  return res.json()
}

export function extractSenderAndText(message: GmailMessage): { from: string; text: string } {
  const headers = message.payload?.headers ?? []
  const from = headers.find((header) => header.name === 'From')?.value ?? ''

  function findPlainText(parts: GmailMessagePart[]): string {
    for (const part of parts ?? []) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64url').toString('utf-8')
      }
      if (part.parts) {
        const nested = findPlainText(part.parts)
        if (nested) return nested
      }
    }
    return ''
  }

  const text = message.payload?.body?.data
    ? Buffer.from(message.payload.body.data, 'base64url').toString('utf-8')
    : findPlainText(message.payload?.parts ?? [])

  return { from, text }
}

export function normalizeSenderAddress(fromHeader: string): string | null {
  const bracketed = fromHeader.match(/<([^<>]+)>/)?.[1]
  const candidate = (bracketed ?? fromHeader).trim().toLowerCase()
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(candidate)) return null
  return candidate
}
