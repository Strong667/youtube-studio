// Запросы к YouTube Data API v3 с сервера. Токен берётся из google.js
// и обновляется автоматически по сохранённому refresh token.

import { getAccessToken, invalidateAccessToken } from './google'

const API = 'https://www.googleapis.com/youtube/v3'
const UPLOAD = 'https://www.googleapis.com/upload/youtube/v3'
const MAX_VIDEOS = 200 // сколько последних видео загружать в список

export class YouTubeError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

const num = (x) => Number(x ?? 0)

function pick(obj = {}, keys) {
  const out = {}
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k]
  return out
}

async function errorFrom(res) {
  let msg = `Ошибка YouTube API (${res.status})`
  try {
    const j = await res.json()
    msg = j.error?.message || msg
  } catch {
    /* тело не JSON */
  }
  // 401 от Google уже обработан повтором; остальное отдаём клиенту как есть (4xx) или 502.
  return new YouTubeError(msg, res.status >= 400 && res.status < 500 ? res.status : 502)
}

// fetch с токеном: при 401 сбрасываем кэш токена и пробуем ещё раз.
async function authed(url, init = {}, retry = true) {
  const token = await getAccessToken()
  const res = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } })
  if (res.status === 401 && retry) {
    invalidateAccessToken()
    return authed(url, init, false)
  }
  return res
}

async function request(path, { method = 'GET', params = {}, body } = {}) {
  const url = new URL(API + path)
  for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, v)
  const res = await authed(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw await errorFrom(res)
  return res.status === 204 ? null : res.json()
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

async function getRawChannel(part) {
  const r = await request('/channels', { params: { part, mine: true } })
  const c = r.items?.[0]
  if (!c) throw new YouTubeError('У этого аккаунта Google нет YouTube-канала', 404)
  return c
}

export async function getChannel() {
  return mapChannel(await getRawChannel('snippet,statistics,brandingSettings'))
}

// Через API можно менять описание, ключевые слова и страну.
// Название, псевдоним и аватар меняются только в YouTube Studio.
export async function updateChannel(patch) {
  const c = await getRawChannel('brandingSettings')
  const channel = { ...c.brandingSettings?.channel }
  if (typeof patch.description === 'string') channel.description = patch.description
  if (typeof patch.keywords === 'string') channel.keywords = patch.keywords
  if (patch.country) channel.country = String(patch.country).toUpperCase().slice(0, 2)
  await request('/channels', {
    method: 'PUT',
    params: { part: 'brandingSettings' },
    body: { id: c.id, brandingSettings: { ...c.brandingSettings, channel } },
  })
  return getChannel()
}

export async function listVideos() {
  const c = await getRawChannel('contentDetails')
  const playlistId = c.contentDetails?.relatedPlaylists?.uploads
  if (!playlistId) return []

  // YouTube иногда отдаёт одно видео дважды на разных страницах — убираем повторы.
  const ids = new Set()
  let pageToken
  do {
    const r = await request('/playlistItems', { params: { part: 'contentDetails', playlistId, maxResults: 50, pageToken } })
    for (const i of r.items) ids.add(i.contentDetails.videoId)
    pageToken = r.nextPageToken
  } while (pageToken && ids.size < MAX_VIDEOS)

  const list = [...ids]
  const videos = new Map()
  for (let i = 0; i < list.length; i += 50) {
    const r = await request('/videos', {
      params: { part: 'snippet,status,statistics,contentDetails', id: list.slice(i, i + 50).join(','), maxResults: 50 },
    })
    for (const v of r.items) videos.set(v.id, mapVideo(v))
  }
  return [...videos.values()].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
}

// Создаёт сессию возобновляемой загрузки. Сам файл браузер отправляет
// прямо в Google по полученной ссылке — через наш сервер он не идёт.
// Заголовок Origin нужен, чтобы Google разрешил браузеру (CORS) загрузку по этой ссылке.
export async function startUpload(data, { fileType, fileSize, origin }) {
  const res = await authed(`${UPLOAD}/videos?uploadType=resumable&part=snippet,status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': fileType || 'video/*',
      'X-Upload-Content-Length': String(fileSize),
      Origin: origin,
    },
    body: JSON.stringify({
      snippet: {
        title: String(data.title ?? '').slice(0, 100),
        description: String(data.description ?? '').slice(0, 5000),
        tags: Array.isArray(data.tags) ? data.tags : [],
        categoryId: data.categoryId || '22',
      },
      status: { privacyStatus: data.privacyStatus || 'private', selfDeclaredMadeForKids: false },
    }),
  })
  if (!res.ok) throw await errorFrom(res)
  const uploadUrl = res.headers.get('Location')
  if (!uploadUrl) throw new YouTubeError('YouTube не вернул адрес для загрузки файла', 502)
  return uploadUrl
}

// videos.update перезаписывает snippet и status целиком, поэтому сначала
// читаем текущие значения и сохраняем поля, которых нет в форме.
export async function updateVideo(id, patch) {
  const r = await request('/videos', { params: { part: 'snippet,status', id } })
  const cur = r.items?.[0]
  if (!cur) throw new YouTubeError('Видео не найдено на YouTube', 404)
  const snippet = {
    ...pick(cur.snippet, ['title', 'description', 'tags', 'categoryId', 'defaultLanguage', 'defaultAudioLanguage']),
    ...pick(patch, ['title', 'description', 'tags', 'categoryId']),
  }
  const status = {
    ...pick(cur.status, ['privacyStatus', 'embeddable', 'license', 'publicStatsViewable', 'selfDeclaredMadeForKids', 'publishAt']),
    ...pick(patch, ['privacyStatus']),
  }
  if (status.privacyStatus !== 'private') delete status.publishAt
  await request('/videos', { method: 'PUT', params: { part: 'snippet,status' }, body: { id, snippet, status } })
}

// Свои обложки доступны только подтверждённым аккаунтам YouTube.
export async function setThumbnail(id, body, contentType) {
  const res = await authed(`${UPLOAD}/thumbnails/set?videoId=${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body,
  })
  if (!res.ok) throw await errorFrom(res)
}

export async function deleteVideo(id) {
  await request('/videos', { method: 'DELETE', params: { id } })
}
