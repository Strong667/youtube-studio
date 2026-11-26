import { invalidateAccessToken, revoke } from '@/server/google'
import { json, route } from '@/server/http'
import { clearedCookie, SESSION_COOKIE } from '@/server/session'
import { updateStore } from '@/server/store'

// Полное отключение: отзываем доступ у Google и стираем ключи и Authenticator.
export const POST = route(async (request, ctx, session) => {
  await revoke(session.store.google?.refreshToken)
  invalidateAccessToken()
  await updateStore((s) => ({ ...s, google: null, totp: null, pendingTotpSecret: null, sessionVersion: s.sessionVersion + 1 }))
  const res = json({ ok: true })
  res.cookies.set(clearedCookie(SESSION_COOKIE))
  return res
})
