'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import * as demo from '@/lib/youtube'
import { authApi, isAuthError, serverApi } from '@/lib/serverApi'

const YouTubeContext = createContext(null)
const demoApi = { mode: 'demo', ...demo }

// Режим приложения по ответу сервера:
//   demo   — сервер не настроен (.env.local пуст), данные в браузере
//   google — полный вход, данные настоящего канала
//   locked — нужен вход (Google и/или код Authenticator)
function modeFor(auth) {
  if (!auth) return 'loading'
  if (!auth.configured) return 'demo'
  return auth.stage === 'full' ? 'google' : 'locked'
}

async function boot() {
  let auth
  try {
    auth = await authApi.status()
  } catch (e) {
    return { auth: null, channel: null, videos: [], error: `Сервер недоступен: ${e.message}` }
  }
  const mode = modeFor(auth)
  if (mode === 'locked') return { auth, channel: null, videos: [], error: null }
  const source = mode === 'google' ? serverApi : demoApi
  try {
    const [channel, videos] = await Promise.all([source.getChannel(), source.listVideos()])
    return { auth, channel, videos, error: null }
  } catch (e) {
    if (isAuthError(e)) {
      // сессия истекла или доступ Google отозван — показываем экран входа
      return { auth: await authApi.status().catch(() => auth), channel: null, videos: [], error: e.message }
    }
    return { auth, channel: null, videos: [], error: e.message }
  }
}

export function YouTubeProvider({ children }) {
  const [auth, setAuth] = useState(null)
  const [channel, setChannel] = useState(null)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const apply = useCallback((r) => {
    setAuth(r.auth)
    setChannel(r.channel)
    setVideos(r.videos)
    setError(r.error)
    setLoading(false)
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    apply(await boot())
  }, [apply])

  useEffect(() => {
    let alive = true
    boot().then((r) => alive && apply(r))
    return () => {
      alive = false
    }
  }, [apply])

  const mode = modeFor(auth)
  const api = mode === 'google' ? serverApi : demoApi

  // Обновить только данные канала (без смены режима).
  const refresh = useCallback(async () => {
    const [ch, vids] = await Promise.all([api.getChannel(), api.listVideos()])
    setChannel(ch)
    setVideos(vids)
  }, [api])

  // Изменения: при 401 возвращаемся к экрану входа.
  const guard = async (fn) => {
    try {
      return await fn()
    } catch (e) {
      if (isAuthError(e)) await reload()
      throw e
    }
  }

  const value = {
    mode,
    auth,
    channel,
    videos,
    loading,
    error,
    clearError: () => setError(null),
    refresh: () => guard(refresh),
    reload,

    // вход
    verifyCode: async (code) => {
      await authApi.verify(code)
      await reload()
    },
    resetTotp: async () => {
      await authApi.resetTotp()
      await reload()
    },
    logout: async () => {
      await authApi.logout()
      await reload()
    },
    disconnect: async () => {
      await authApi.disconnect()
      await reload()
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
      await refresh()
    },
  }

  return <YouTubeContext.Provider value={value}>{children}</YouTubeContext.Provider>
}

export function useYouTube() {
  const ctx = useContext(YouTubeContext)
  if (!ctx) throw new Error('useYouTube must be used inside YouTubeProvider')
  return ctx
}
