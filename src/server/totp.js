// TOTP (RFC 6238) — коды Google Authenticator: 6 цифр, шаг 30 секунд, SHA-1.

import crypto from 'node:crypto'

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Encode(buf) {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31]
  return out
}

function base32Decode(str) {
  let bits = 0
  let value = 0
  const out = []
  for (const ch of str.toUpperCase().replace(/[^A-Z2-7]/g, '')) {
    value = (value << 5) | B32.indexOf(ch)
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

function hotp(key, counter) {
  const msg = Buffer.alloc(8)
  msg.writeBigUInt64BE(BigInt(counter))
  const h = crypto.createHmac('sha1', key).update(msg).digest()
  const offset = h[h.length - 1] & 15
  const code = (h.readUInt32BE(offset) & 0x7fffffff) % 1_000_000
  return String(code).padStart(6, '0')
}

export function generateSecret() {
  return base32Encode(crypto.randomBytes(20))
}

export function otpauthUri(secret, account) {
  const issuer = 'YouTube Studio'
  const label = encodeURIComponent(`${issuer}:${account}`)
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
}

// Возвращает номер шага, если код верный (±30 секунд на расхождение часов), иначе null.
// Коды с шагом <= lastCounter отклоняются — один и тот же код нельзя использовать дважды.
export function verifyTotp(secret, code, lastCounter = -1) {
  const clean = String(code ?? '').replace(/\s/g, '')
  if (!/^\d{6}$/.test(clean)) return null
  const key = base32Decode(secret)
  const now = Math.floor(Date.now() / 30_000)
  for (const step of [now - 1, now, now + 1]) {
    if (step <= lastCounter) continue
    if (crypto.timingSafeEqual(Buffer.from(hotp(key, step)), Buffer.from(clean))) return step
  }
  return null
}

// Защита от перебора: не больше 5 неверных кодов за 5 минут.
const failures = []
const WINDOW = 5 * 60_000
const MAX_FAILS = 5

export function isLockedOut() {
  const since = Date.now() - WINDOW
  while (failures.length && failures[0] < since) failures.shift()
  return failures.length >= MAX_FAILS
}

export function recordFailure() {
  failures.push(Date.now())
}

export function resetFailures() {
  failures.length = 0
}
