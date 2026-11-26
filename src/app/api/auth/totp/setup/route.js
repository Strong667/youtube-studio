import QRCode from 'qrcode'
import { json, route } from '@/server/http'
import { updateStore } from '@/server/store'
import { generateSecret, otpauthUri } from '@/server/totp'

// QR-код для привязки Google Authenticator (только сразу после входа через Google).
export const GET = route(
  async (request, ctx, session) => {
    let secret = session.store.pendingTotpSecret
    if (!secret) {
      secret = generateSecret()
      await updateStore((s) => ({ ...s, pendingTotpSecret: secret }))
    }
    const uri = otpauthUri(secret, session.store.google?.email || 'admin')
    const qr = await QRCode.toDataURL(uri, { margin: 1, width: 240 })
    return json({ qr, secret })
  },
  { stage: 'setup' },
)
