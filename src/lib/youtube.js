// Слой работы с данными канала.
// Сейчас данные хранятся в localStorage (демо-режим).
// Позже каждую функцию можно переписать на вызовы YouTube Data API v3
// (channels.list, videos.list, videos.insert, videos.update, videos.delete),
// не трогая страницы приложения.

import { mockChannel, mockVideos } from './mockData'

const STORAGE_KEY = 'yt-studio-data-v1'
const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms))

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* повреждённые данные — начинаем с демо */
  }
  return { channel: mockChannel, videos: mockVideos }
}

function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* хранилище недоступно — работаем в памяти */
  }
}

let db = load()

export async function getChannel() {
  await delay()
  return {
    ...db.channel,
    statistics: { ...db.channel.statistics, videoCount: db.videos.length },
  }
}

export async function updateChannel(patch) {
  await delay()
  db = { ...db, channel: { ...db.channel, ...patch } }
  save(db)
  return getChannel()
}

export async function listVideos() {
  await delay()
  return [...db.videos].sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
  )
}

export async function getVideo(id) {
  await delay()
  return db.videos.find((v) => v.id === id) ?? null
}

export async function createVideo(data) {
  await delay(400)
  const video = {
    id: 'vid_' + Date.now().toString(36),
    publishedAt: new Date().toISOString(),
    duration: 'PT0S',
    statistics: { viewCount: 0, likeCount: 0, commentCount: 0 },
    ...data,
  }
  db = { ...db, videos: [video, ...db.videos] }
  save(db)
  return video
}

export async function updateVideo(id, patch) {
  await delay()
  db = {
    ...db,
    videos: db.videos.map((v) => (v.id === id ? { ...v, ...patch } : v)),
  }
  save(db)
  return db.videos.find((v) => v.id === id)
}

export async function deleteVideo(id) {
  await delay()
  db = { ...db, videos: db.videos.filter((v) => v.id !== id) }
  save(db)
}

export function resetDemoData() {
  db = { channel: mockChannel, videos: mockVideos }
  save(db)
}
