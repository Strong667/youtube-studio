// Настройки сервера из .env.local. Читаются только на сервере.

export const config = {
  clientId: process.env.GOOGLE_CLIENT_ID?.trim() || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() || '',
  appSecret: process.env.APP_SECRET?.trim() || '',
  adminEmail: process.env.ADMIN_EMAIL?.trim().toLowerCase() || '',
  appUrl: process.env.APP_URL?.trim().replace(/\/$/, '') || '',
}

export function missingEnv() {
  const missing = []
  if (!config.clientId) missing.push('GOOGLE_CLIENT_ID')
  if (!config.clientSecret) missing.push('GOOGLE_CLIENT_SECRET')
  if (config.appSecret.length < 32) missing.push('APP_SECRET')
  if (!config.adminEmail) missing.push('ADMIN_EMAIL')
  return missing
}

export const isConfigured = () => missingEnv().length === 0

// Адрес сайта: APP_URL, если задан (нужен за прокси), иначе из запроса.
export function baseUrl(request) {
  return config.appUrl || request.nextUrl.origin
}

export const redirectUri = (request) => `${baseUrl(request)}/api/auth/google/callback`
