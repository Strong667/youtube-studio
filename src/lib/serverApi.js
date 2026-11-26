// Клиент для API нашего сервера. Браузер не обращается к YouTube напрямую,
// кроме загрузки самого видеофайла по одноразовой ссылке.

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function call(path, { method = 'GET', body, file } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: file ? { 'Content-Type': file.type } : body ? { 'Content-Type': 'application/json' } : {},
    body: file ?? (body ? JSON.stringify(body) : undefined),
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error || `Ошибка сервера (${res.status})`, res.status, data.code)
  return data
}

// Сессия закончилась или Google нужно подключить заново.
export const isAuthError = (e) => e instanceof ApiError && e.status === 401

function uploadFile(uploadUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', file.type || 'video/*')
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total)
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText))
        } catch {
          reject(new Error('YouTube вернул неожиданный ответ после загрузки'))
        }
        return
      }
      let msg = `Ошибка загрузки (${xhr.status})`
      try {
        msg = JSON.parse(xhr.responseText).error?.message || msg
      } catch {
        /* не JSON */
      }
      reject(new Error(msg))
    }
    xhr.onerror = () => reject(new Error('Загрузка прервалась (сеть или блокировка браузером)'))
    xhr.send(file)
  })
}

export const authApi = {
  status: () => call('/auth/status'),
  totpSetup: () => call('/auth/totp/setup'),
  verify: (code) => call('/auth/totp/verify', { method: 'POST', body: { code } }),
  resetTotp: () => call('/auth/totp/reset', { method: 'POST' }),
  logout: () => call('/auth/logout', { method: 'POST' }),
  disconnect: () => call('/auth/disconnect', { method: 'POST' }),
}

export const serverApi = {
  mode: 'google',
  getChannel: () => call('/youtube/channel'),
  updateChannel: (patch) => call('/youtube/channel', { method: 'PATCH', body: patch }),
  listVideos: () => call('/youtube/videos'),
  updateVideo: (id, patch) => call(`/youtube/videos/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch }),
  deleteVideo: (id) => call(`/youtube/videos/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  setThumbnail: (id, file) => call(`/youtube/videos/${encodeURIComponent(id)}/thumbnail`, { method: 'POST', file }),
  async createVideo(data, file, onProgress) {
    if (!file) throw new Error('Выберите видеофайл для загрузки')
    const { uploadUrl } = await call('/youtube/videos/upload', {
      method: 'POST',
      body: { ...data, fileType: file.type, fileSize: file.size },
    })
    const video = await uploadFile(uploadUrl, file, onProgress)
    return { id: video.id }
  },
}
