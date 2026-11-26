import { connection } from 'next/server'
import { isConfigured, missingEnv } from '@/server/config'
import { json } from '@/server/http'
import { getSession } from '@/server/session'
import { readStore } from '@/server/store'

// Состояние входа для клиента. Email показываем только после полного входа.
export async function GET() {
  await connection()
  if (!isConfigured()) return json({ configured: false, missing: missingEnv() })
  const session = await getSession()
  const store = session?.store ?? (await readStore())
  return json({
    configured: true,
    connected: Boolean(store.google?.refreshToken),
    totpEnabled: Boolean(store.totp?.enabled),
    stage: session?.stage ?? null,
    email: session?.stage === 'full' ? store.google?.email : null,
  })
}
