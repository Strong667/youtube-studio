import { apiError, json, readJson, route } from '@/server/http'
import { sessionCookie } from '@/server/session'
import { readStore, updateStore } from '@/server/store'
import { isLockedOut, recordFailure, resetFailures, verifyTotp } from '@/server/totp'

// Проверка кода Authenticator. На этапе setup — завершает привязку,
// иначе — обычный вход. Успех выдаёт полную сессию на 7 дней.
export const POST = route(
  async (request, ctx, session) => {
    if (isLockedOut()) return apiError('Слишком много неверных кодов. Подождите 5 минут.', 429)
    const { code } = await readJson(request)
    const store = session?.store ?? (await readStore())
    if (!store.google?.refreshToken) return apiError('Сначала подключите Google', 400)

    const wrong = () => {
      recordFailure()
      return apiError('Неверный код', 400, 'invalid_code')
    }
    let next

    if (session?.stage === 'setup') {
      const secret = store.pendingTotpSecret
      if (!secret) return apiError('Сначала откройте QR-код', 400)
      const step = verifyTotp(secret, code)
      if (step === null) return wrong()
      next = await updateStore((s) => ({ ...s, totp: { secret, enabled: true, lastCounter: step }, pendingTotpSecret: null }))
    } else {
      if (!store.totp?.enabled) return apiError('Authenticator не настроен — войдите через Google', 400)
      const step = verifyTotp(store.totp.secret, code, store.totp.lastCounter ?? -1)
      if (step === null) return wrong()
      next = await updateStore((s) => ({ ...s, totp: { ...s.totp, lastCounter: step } }))
    }

    resetFailures()
    const res = json({ ok: true })
    res.cookies.set(sessionCookie(request, 'full', next.sessionVersion))
    return res
  },
  { stage: null },
)
