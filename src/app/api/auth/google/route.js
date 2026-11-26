import crypto from 'node:crypto'
import { connection, NextResponse } from 'next/server'
import { baseUrl, isConfigured, redirectUri } from '@/server/config'
import { authUrl } from '@/server/google'
import { isSecure, STATE_COOKIE } from '@/server/session'

// Начало входа через Google: перенаправляем на страницу согласия.
export async function GET(request) {
  await connection()
  if (!isConfigured()) return NextResponse.redirect(`${baseUrl(request)}/?auth_error=not_configured`)
  const state = crypto.randomBytes(16).toString('base64url')
  const res = NextResponse.redirect(authUrl(redirectUri(request), state))
  res.cookies.set({ name: STATE_COOKIE, value: state, httpOnly: true, sameSite: 'lax', secure: isSecure(request), path: '/', maxAge: 600 })
  return res
}
