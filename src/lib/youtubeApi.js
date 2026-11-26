// Клиент YouTube Data API v3 для настоящего канала.
// Интерфейс совпадает с демо-режимом (src/lib/youtube.js), поэтому страницы
// не знают, с каким источником работают.

const API = 'https://www.googleapis.com/youtube/v3'
const UPLOAD = 'https://www.googleapis.com/upload/youtube/v3'
const MAX_VIDEOS = 200 // сколько последних видео загружать в список

export class AuthError extends Error {}

const num = (x) => Number(x ?? 0)

function pick(obj = {}, keys) {
  const out = {}
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k]
  return out
}

async function readError(res) {
  if (res.status === 401) return new AuthError('Сессия Google истекла — войдите снова')
  let msg = `Ошибка YouTube API (${res.status})`
  try {
    const j = await res.json()
    msg = j.error?.message || msg
  } catch {
    /* тело не JSON */
  }
  return new Error(msg)
}

function mapChannel(c) {
  return {
    id: c.id,
    title: c.snippet.title,
    handle: c.snippet.customUrl || '',
    description: c.brandingSettings?.channel?.description ?? c.snippet.description ?? '',
    keywords: c.brandingSettings?.channel?.keywords || '',
    country: c.brandingSettings?.channel?.country || c.snippet.country || '',
    avatar: c.snippet.thumbnails?.medium?.url || c.snippet.thumbnails?.default?.url || '',
    publishedAt: c.snippet.publishedAt,
    statistics: {
      subscriberCount: num(c.statistics?.subscriberCount),
      viewCount: num(c.statistics?.viewCount),
      videoCount: num(c.statistics?.videoCount),
    },
  }
}

function mapVideo(v) {
  const t = v.snippet?.thumbnails || {}
  return {
    id: v.id,
    title: v.snippet?.title ?? '',
    description: v.snippet?.description ?? '',
    tags: v.snippet?.tags ?? [],
    categoryId: v.snippet?.categoryId ?? '22',
    privacyStatus: v.status?.privacyStatus ?? 'private',
    uploadStatus: v.status?.uploadStatus,
    thumbnail: (t.medium || t.high || t.default)?.url || '',
    publishedAt: v.snippet?.publishedAt,
    duration: v.contentDetails?.duration || 'PT0S',
    statistics: {
      viewCount: num(v.statistics?.viewCount),
      likeCount: num(v.statistics?.likeCount),
      commentCount: num(v.statistics?.commentCount),
    },
  }
}

export function createYouTubeApi(accessToken) {
  const auth = { Authorization: `Bearer ${accessToken}` }
  let uploadsPlaylist = null

  async function request(path, { method = 'GET', params = {}, body } = {}) {
    const url = new URL(API + path)
    for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, v)
    const res = await fetch(url, {
      method,
      headers: body ? { ...auth, 'Content-Type': 'application/json' } : auth,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) throw await readError(res)
    return res.status === 204 ? null : res.json()
  }

  async function getRawChannel(part) {
    const r = await request('/channels', { params: { part, mine: true } })
    const c = r.items?.[0]
    if (!c) throw new Error('У этого аккаунта Google нет YouTube-канала')
    return c
  }

  async function getRawVideo(id, part) {
    const r = await request('/videos', { params: { part, id } })
    const v = r.items?.[0]
    if (!v) throw new Error('Видео не найдено на YouTube')
    return v
  }

  return {
    mode: 'google',

    async getChannel() {
      const c = await getRawChannel('snippet,statistics,contentDetails,brandingSettings')
      uploadsPlaylist = c.contentDetails?.relatedPlaylists?.uploads
      return mapChannel(c)
    },

    // Через API можно менять описание, ключевые слова и страну.
    // Название, псевдоним и аватар меняются только в YouTube Studio.
    async updateChannel(patch) {
      const c = await getRawChannel('brandingSettings')
      const channel = {
        ...c.brandingSettings?.channel,
        description: patch.description,
        keywords: patch.keywords,
      }
      if (patch.country) channel.country = patch.country.toUpperCase()
      await request('/channels', {
        method: 'PUT',
        params: { part: 'brandingSettings' },
        body: { id: c.id, brandingSettings: { ...c.brandingSettings, channel } },
      })
      return this.getChannel()
    },

    async listVideos() {
      if (!uploadsPlaylist) await this.getChannel()
      if (!uploadsPlaylist) return []

      const ids = []
      let pageToken
      do {
        const r = await request('/playlistItems', {
          params: { part: 'contentDetails', playlistId: uploadsPlaylist, maxResults: 50, pageToken },
        })
        ids.push(...r.items.map((i) => i.contentDetails.videoId))
        pageToken = r.nextPageToken
      } while (pageToken && ids.length < MAX_VIDEOS)

      const videos = []
      for (let i = 0; i < ids.length; i += 50) {
        const r = await request('/videos', {
          params: { part: 'snippet,status,statistics,contentDetails', id: ids.slice(i, i + 50).join(','), maxResults: 50 },
        })
        videos.push(...r.items.map(mapVideo))
      }
      return videos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    },

    // Возобновляемая загрузка: 1) создаём сессию с метаданными, 2) отправляем файл.
    async createVideo(data, file, onProgress) {
      if (!file) throw new Error('Выберите видеофайл для загрузки')
      const init = await fetch(`${UPLOAD}/videos?uploadType=resumable&part=snippet,status`, {
        method: 'POST',
        headers: {
          ...auth,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': file.type || 'video/*',
          'X-Upload-Content-Length': String(file.size),
        },
        body: JSON.stringify({
          snippet: {
            title: data.title,
            description: data.description,
            tags: data.tags,
            categoryId: data.categoryId,
          },
          status: { privacyStatus: data.privacyStatus, selfDeclaredMadeForKids: false },
        }),
      })
      if (!init.ok) throw await readError(init)
      const uploadUrl = init.headers.get('Location')
      if (!uploadUrl) throw new Error('YouTube не вернул адрес для загрузки файла')

      const video = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Authorization', auth.Authorization)
        xhr.setRequestHeader('Content-Type', file.type || 'video/*')
        xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total)
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText))
          else if (xhr.status === 401) reject(new AuthError('Сессия Google истекла — войдите снова'))
          else {
            let msg = `Ошибка загрузки (${xhr.status})`
            try {
              msg = JSON.parse(xhr.responseText).error?.message || msg
            } catch {
              /* не JSON */
            }
            reject(new Error(msg))
          }
        }
        xhr.onerror = () => reject(new Error('Сеть прервала загрузку видео'))
        xhr.send(file)
      })
      return mapVideo(video)
    },

    // videos.update перезаписывает snippet и status целиком, поэтому сначала
    // читаем текущие значения и сохраняем поля, которых нет в форме.
    async updateVideo(id, patch) {
      const cur = await getRawVideo(id, 'snippet,status')
      const snippet = {
        ...pick(cur.snippet, ['title', 'description', 'tags', 'categoryId', 'defaultLanguage', 'defaultAudioLanguage']),
        title: patch.title,
        description: patch.description,
        tags: patch.tags,
        categoryId: patch.categoryId,
      }
      const status = {
        ...pick(cur.status, ['privacyStatus', 'embeddable', 'license', 'publicStatsViewable', 'selfDeclaredMadeForKids', 'publishAt']),
        privacyStatus: patch.privacyStatus,
      }
      if (status.privacyStatus !== 'private') delete status.publishAt
      await request('/videos', { method: 'PUT', params: { part: 'snippet,status' }, body: { id, snippet, status } })
    },

    // Свои обложки доступны только подтверждённым аккаунтам YouTube.
    async setThumbnail(id, file) {
      const res = await fetch(`${UPLOAD}/thumbnails/set?videoId=${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': file.type || 'image/jpeg' },
        body: file,
      })
      if (!res.ok) throw await readError(res)
    },

    async deleteVideo(id) {
      await request('/videos', { method: 'DELETE', params: { id } })
    },
  }
}
