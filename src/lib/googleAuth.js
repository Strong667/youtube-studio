// Вход через Google (Google Identity Services, token model).
// Токен доступа живёт ~1 час и хранится в sessionStorage — после закрытия
// вкладки нужно войти снова. Секретов на клиенте нет: Client ID публичный.

const SCOPE = 'https://www.googleapis.com/auth/youtube'
const TOKEN_KEY = 'yt-studio-token'
const CLIENT_KEY = 'yt-studio-client-id'
const GIS_SRC = 'https://accounts.google.com/gsi/client'

const ENV_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

function storageGet(storage, key) {
  try {
    return window[storage].getItem(key)
  } catch {
    return null
  }
}
function storageSet(storage, key, value) {
  try {
    if (value == null) window[storage].removeItem(key)
    else window[storage].setItem(key, value)
  } catch {
    /* хранилище недоступно */
  }
}

/* ---------- Client ID (env или ввод на странице настроек) ---------- */

const listeners = new Set()

export const clientIdFromEnv = Boolean(ENV_CLIENT_ID)

export function getClientId() {
  return ENV_CLIENT_ID || storageGet('localStorage', CLIENT_KEY) || ''
}

export function setClientId(id) {
  storageSet('localStorage', CLIENT_KEY, id.trim() || null)
  listeners.forEach((l) => l())
}

// для useSyncExternalStore
export function subscribeClientId(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/* ---------- Загрузка библиотеки Google ---------- */

let gisPromise = null

export function loadGis() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Только в браузере'))
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  gisPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = GIS_SRC
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      gisPromise = null
      reject(new Error('Не удалось загрузить библиотеку входа Google'))
    }
    document.head.appendChild(s)
  })
  return gisPromise
}

/* ---------- Токен ---------- */

export function getStoredToken() {
  try {
    const t = JSON.parse(storageGet('sessionStorage', TOKEN_KEY))
    return t && t.expires_at > Date.now() ? t : null
  } catch {
    return null
  }
}

export function clearStoredToken() {
  storageSet('sessionStorage', TOKEN_KEY, null)
}

export async function signIn() {
  const clientId = getClientId()
  if (!clientId) throw new Error('Укажите OAuth Client ID на странице «Настройки»')
  await loadGis()

  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error) {
          reject(new Error(resp.error_description || resp.error))
          return
        }
        const token = {
          access_token: resp.access_token,
          // обновляем за минуту до истечения
          expires_at: Date.now() + (Number(resp.expires_in) - 60) * 1000,
        }
        storageSet('sessionStorage', TOKEN_KEY, JSON.stringify(token))
        resolve(token)
      },
      error_callback: (err) => {
        const messages = {
          popup_closed: 'Окно входа закрыто',
          popup_failed_to_open: 'Браузер заблокировал окно входа — разрешите всплывающие окна',
        }
        reject(new Error(messages[err?.type] || err?.message || 'Ошибка входа Google'))
      },
    })
    client.requestAccessToken()
  })
}

export function signOut(token) {
  clearStoredToken()
  if (token?.access_token && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(token.access_token, () => {})
  }
}
