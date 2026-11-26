'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import * as demo from '@/lib/youtube'
import { AuthError, createYouTubeApi } from '@/lib/youtubeApi'
import * as auth from '@/lib/googleAuth'

const YouTubeContext = createContext(null)
const demoApi = { mode: 'demo', ...demo }

const apiFor = (token) => (token ? createYouTubeApi(token.access_token) : demoApi)

// Если сессия Google истекла — тихо возвращаемся к демо-данным с сообщением.
async function fetchAll(token) {
  try {
    const source = apiFor(token)
    const [channel, videos] = await Promise.all([source.getChannel(), source.listVideos()])
    return { token, channel, videos, error: null }
  } catch (e) {
    if (e instanceof AuthError) {
      auth.clearStoredToken()
      return { ...(await fetchAll(null)), error: e.message }
    }
    return { token, channel: null, videos: [], error: e.message }
  }
}

export function YouTubeProvider({ children }) {
  const [token, setToken] = useState(null)
  const [channel, setChannel] = useState(null)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const clientId = useSyncExternalStore(auth.subscribeClientId, auth.getClientId, () => '')
  const api = useMemo(() => apiFor(token), [token])

  // Загружает канал и видео из нужного источника. setState вызывается
  // только после await, чтобы не дёргать рендер синхронно из эффекта.
  const loadAll = useCallback(async (tok) => {
    const r = await fetchAll(tok)
    setToken(r.token)
    setChannel(r.channel)
    setVideos(r.videos)
    setError(r.error)
    setLoading(false)
  }, [])

  // Первая загрузка: токен и демо-данные лежат в браузере, поэтому только на клиенте.
  useEffect(() => {
    let alive = true
    fetchAll(auth.getStoredToken()).then((r) => {
      if (!alive) return
      setToken(r.token)
      setChannel(r.channel)
      setVideos(r.videos)
      setError(r.error)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  // Заранее подгружаем библиотеку Google, чтобы окно входа открылось сразу по клику.
  useEffect(() => {
    if (clientId) auth.loadGis().catch(() => {})
  }, [clientId])

  // Обёртка для изменений: при истёкшей сессии возвращаемся в демо-режим.
  const guard = useCallback(
    async (fn) => {
      try {
        return await fn()
      } catch (e) {
        if (e instanceof AuthError) {
          auth.clearStoredToken()
          await loadAll(null)
        }
        throw e
      }
    },
    [loadAll],
  )

  const refresh = useCallback(() => loadAll(token), [loadAll, token])

  const value = {
    mode: api.mode,
    channel,
    videos,
    loading,
    error,
    clearError: () => setError(null),
    refresh,

    clientId,
    clientIdFromEnv: auth.clientIdFromEnv,
    setClientId: auth.setClientId,
    signIn: async () => {
      const tok = await auth.signIn()
      setLoading(true)
      await loadAll(tok)
    },
    signOut: async () => {
      auth.signOut(token)
      setLoading(true)
      await loadAll(null)
    },

    canSetThumbnailFile: Boolean(api.setThumbnail),

    updateChannel: (patch) =>
      guard(async () => {
        setChannel(await api.updateChannel(patch))
      }),
    createVideo: (data, file, onProgress) =>
      guard(async () => {
        const v = await api.createVideo(data, file, onProgress)
        await refresh()
        return v
      }),
    updateVideo: (id, patch) =>
      guard(async () => {
        await api.updateVideo(id, patch)
        await refresh()
      }),
    setThumbnail: (id, file) =>
      guard(async () => {
        await api.setThumbnail(id, file)
        await refresh()
      }),
    deleteVideo: (id) =>
      guard(async () => {
        await api.deleteVideo(id)
        await refresh()
      }),
    resetDemo: async () => {
      demo.resetDemoData()
      await loadAll(token)
    },
  }

  return <YouTubeContext.Provider value={value}>{children}</YouTubeContext.Provider>
}

export function useYouTube() {
  const ctx = useContext(YouTubeContext)
  if (!ctx) throw new Error('useYouTube must be used inside YouTubeProvider')
  return ctx
}
