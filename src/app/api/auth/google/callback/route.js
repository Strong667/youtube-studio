import { connection, NextResponse } from 'next/server'
import { baseUrl, config, isConfigured, redirectUri } from '@/server/config'
import { emailFromIdToken, exchangeCode, hasYouTubeScope, primeAccessToken, revoke } from '@/server/google'
import { clearedCookie, sessionCookie, STATE_COOKIE } from '@/server/session'
import { updateStore } from '@/server/store'

// Google возвращает сюда код. Меняем его на токены, проверяем, что это
// аккаунт владельца (ADMIN_EMAIL), и сохраняем refresh token.
export async function GET(request) {
  await connection()
  const base = baseUrl(request)
  const fail = (code) => {
    const res = NextResponse.redirect(`${base}/?auth_error=${code}`)
    res.cookies.set(clearedCookie(STATE_COOKIE))
    return res
  }

  if (!isConfigured()) return fail('not_configured')
  const params = request.nextUrl.searchParams
  if (params.get('error')) return fail(params.get('error') === 'access_denied' ? 'access_denied' : 'google_error')

  const state = request.cookies.get(STATE_COOKIE)?.value
  if (!state || state !== params.get('state')) return fail('state_mismatch')

  let tokens
  try {
    tokens = await exchangeCode(params.get('code'), redirectUri(request))
  } catch (e) {
    console.error('[auth] exchange failed:', e.message)
    return fail('exchange_failed')
  }

  const email = emailFromIdToken(tokens.id_token)
  if (!email || email !== config.adminEmail) {
    await revoke(tokens.refresh_token || tokens.access_token)
    return fail('wrong_account')
  }

  // Сняли галочку YouTube на странице согласия — ключ бесполезен, не сохраняем.
  if (!hasYouTubeScope(tokens.scope)) return fail('missing_scope')

  const store = await updateStore((s) => ({
    ...s,
    google: {
      refreshToken: tokens.refresh_token || s.google?.refreshToken || null,
      email,
      connectedAt: new Date().toISOString(),
    },
  }))
  if (!store.google.refreshToken) return fail('no_refresh_token')
  primeAccessToken(tokens.access_token, tokens.expires_in)

  // Authenticator уже привязан — дальше нужен код; иначе показываем QR-код.
  const stage = store.totp?.enabled ? 'google' : 'setup'
  const res = NextResponse.redirect(`${base}/`)
  res.cookies.set(sessionCookie(request, stage, store.sessionVersion))
  res.cookies.set(clearedCookie(STATE_COOKIE))
  return res
}
