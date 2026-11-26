// Google OAuth на сервере: однократное подключение (refresh token) и
// автоматическое получение access token для запросов к YouTube.

import { config } from './config'
import { readStore, updateStore } from './store'

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const YOUTUBE_SCOPE = 'https://www.googleapis.com/auth/youtube'
const SCOPES = `openid email ${YOUTUBE_SCOPE}`

// Google позволяет снять галочку с отдельных прав на странице согласия.
export const hasYouTubeScope = (scope) => String(scope ?? '').split(' ').includes(YOUTUBE_SCOPE)
export const MISSING_SCOPE_MESSAGE =
  'Google не выдал доступ к YouTube. Войдите через Google снова и отметьте галочку «Управление аккаунтом YouTube».'

// Доступ к YouTube больше не действует — нужно снова подключить Google.
export class GoogleReauthError extends Error {
  constructor(message = 'Доступ к YouTube отозван или истёк — подключите Google заново') {
    super(message)
  }
}

export function authUrl(redirectUri, state) {
  const url = new URL(AUTH_URL)
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline', // нужен refresh token
    prompt: 'consent', // Google выдаёт refresh token только при показе согласия
    include_granted_scopes: 'true',
    login_hint: config.adminEmail,
    state,
  }).toString()
  return url.toString()
}

async function tokenRequest(params) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, ...params }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(json.error_description || json.error || `Google token error ${res.status}`)
    err.code = json.error
    throw err
  }
  return json
}

export function exchangeCode(code, redirectUri) {
  return tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: redirectUri })
}

// id_token получен напрямую от Google по TLS, поэтому подпись можно не проверять.
export function emailFromIdToken(idToken) {
  try {
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8'))
    return payload.email_verified ? payload.email.toLowerCase() : null
  } catch {
    return null
  }
}

/* ---------- access token с кэшем в памяти ---------- */

let cached = null // { token, exp }

export function primeAccessToken(token, expiresIn) {
  cached = { token, exp: Date.now() + Number(expiresIn) * 1000 }
}

export function invalidateAccessToken() {
  cached = null
}

let refreshing = null

export async function getAccessToken() {
  if (cached && cached.exp - 60_000 > Date.now()) return cached.token
  // Несколько параллельных запросов делят одно обновление токена.
  refreshing ??= (async () => {
    const store = await readStore()
    const refreshToken = store.google?.refreshToken
    if (!refreshToken) throw new GoogleReauthError()
    try {
      const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken })
      if (!hasYouTubeScope(t.scope)) {
        const err = new Error(MISSING_SCOPE_MESSAGE)
        err.code = 'missing_scope'
        throw err
      }
      primeAccessToken(t.access_token, t.expires_in)
      return t.access_token
    } catch (e) {
      if (e.code === 'invalid_grant' || e.code === 'missing_scope') {
        // refresh token отозван или истёк (например, приложение в режиме Testing — 7 дней)
        await updateStore((s) => ({ ...s, google: s.google && { ...s.google, refreshToken: null } }))
        cached = null
        throw e.code === 'missing_scope' ? new GoogleReauthError(MISSING_SCOPE_MESSAGE) : new GoogleReauthError()
      }
      throw e
    }
  })().finally(() => {
    refreshing = null
  })
  return refreshing
}

export async function revoke(token) {
  if (!token) return
  await fetch(`${REVOKE_URL}?token=${encodeURIComponent(token)}`, { method: 'POST' }).catch(() => {})
}
