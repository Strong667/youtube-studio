import { json, route } from '@/server/http'
import { sessionCookie } from '@/server/session'
import { updateStore } from '@/server/store'

// Потеряли телефон: после входа через Google можно привязать Authenticator заново.
export const POST = route(
  async (request) => {
    const next = await updateStore((s) => ({ ...s, totp: null, pendingTotpSecret: null }))
    const res = json({ ok: true })
    res.cookies.set(sessionCookie(request, 'setup', next.sessionVersion))
    return res
  },
  { stage: 'google' },
)
