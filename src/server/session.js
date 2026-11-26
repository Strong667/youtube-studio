// Сессия в подписанной cookie (HMAC-SHA256). Этапы:
//   setup  — вошли через Google, Authenticator ещё не привязан
//   google — вошли через Google, нужно ввести код (или сбросить Authenticator)
//   full   — полный доступ к админке

import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { config } from './config'
import { readStore } from './store'

export const SESSION_COOKIE = 'yts_session'
export const STATE_COOKIE = 'yts_oauth_state'

const TTL = {
  setup: 15 * 60,
  google: 15 * 60,
  full: 7 * 24 * 60 * 60,
}

const b64 = (s) => Buffer.from(s).toString('base64url')

function sign(data) {
  return crypto.createHmac('sha256', `session:${config.appSecret}`).update(data).digest('base64url')
}

function safeEqual(a, b) {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb)
}

export function isSecure(request) {
  return (config.appUrl || request.nextUrl.origin).startsWith('https://')
}

// Параметры cookie для NextResponse.cookies.set(...)
export function sessionCookie(request, stage, sessionVersion) {
  const payload = b64(JSON.stringify({ s: stage, v: sessionVersion, exp: Math.floor(Date.now() / 1000) + TTL[stage] }))
  return {
    name: SESSION_COOKIE,
    value: `${payload}.${sign(payload)}`,
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure(request),
    path: '/',
    maxAge: TTL[stage],
  }
}

export function clearedCookie(name) {
  return { name, value: '', path: '/', maxAge: 0 }
}

// Текущая сессия или null. Чтение cookies делает обработчик динамическим.
export async function getSession() {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value
  if (!raw || !config.appSecret) return null
  const [payload, sig] = raw.split('.')
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null
  try {
    const { s, v, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (exp < Date.now() / 1000) return null
    const store = await readStore()
    if (v !== store.sessionVersion) return null
    return { stage: s, store }
  } catch {
    return null
  }
}
