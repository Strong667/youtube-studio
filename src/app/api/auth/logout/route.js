import { json, route } from '@/server/http'
import { clearedCookie, SESSION_COOKIE } from '@/server/session'
import { updateStore } from '@/server/store'

// Выход: сессии на всех устройствах становятся недействительными.
export const POST = route(
  async () => {
    await updateStore((s) => ({ ...s, sessionVersion: s.sessionVersion + 1 }))
    const res = json({ ok: true })
    res.cookies.set(clearedCookie(SESSION_COOKIE))
    return res
  },
  { stage: null },
)
