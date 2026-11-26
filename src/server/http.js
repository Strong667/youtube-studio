// Общая обёртка для API-маршрутов: проверка сессии и единый формат ошибок.

import { connection, NextResponse } from 'next/server'
import { isConfigured } from './config'
import { GoogleReauthError } from './google'
import { getSession } from './session'

export const json = (data, status = 200) => NextResponse.json(data, { status })

export function apiError(message, status, code) {
  return json({ error: message, ...(code && { code }) }, status)
}

// stage: какой этап сессии нужен ('full' по умолчанию, null — без проверки)
export function route(handler, { stage = 'full' } = {}) {
  return async (request, ctx) => {
    await connection() // всегда выполнять при запросе, без предрендера
    try {
      if (!isConfigured()) return apiError('Сервер не настроен: заполните .env.local', 503, 'not_configured')
      const session = await getSession()
      const allowed = stage === null || (Array.isArray(stage) ? stage.includes(session?.stage) : session?.stage === stage)
      if (!allowed) return apiError('Требуется вход', 401, 'unauthorized')
      return await handler(request, ctx, session)
    } catch (e) {
      if (e instanceof GoogleReauthError) return apiError(e.message, 401, 'google_reauth')
      if (e.status) return apiError(e.message, e.status)
      console.error('[api]', e)
      return apiError(e.message || 'Ошибка сервера', 500)
    }
  }
}

export async function readJson(request) {
  try {
    return await request.json()
  } catch {
    return {}
  }
}
