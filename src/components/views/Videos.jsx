'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useYouTube } from '@/components/YouTubeContext'
import VideoThumb from '@/components/VideoThumb'
import { formatDate, formatNumber } from '@/lib/format'
import { privacyLabels } from '@/lib/mockData'

export default function Videos() {
  const { videos, loading, mode, deleteVideo } = useYouTube()
  const [query, setQuery] = useState('')
  const [privacy, setPrivacy] = useState('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return videos.filter(
      (v) =>
        (privacy === 'all' || v.privacyStatus === privacy) &&
        (!q ||
          v.title.toLowerCase().includes(q) ||
          v.tags.some((t) => t.toLowerCase().includes(q))),
    )
  }, [videos, query, privacy])

  const onDelete = async (v) => {
    const warning = mode === 'google' ? '\n\nВидео будет удалено с YouTube навсегда.' : ''
    if (!confirm(`Удалить видео «${v.title}»?${warning}`)) return
    try {
      await deleteVideo(v.id)
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Видео на канале</h1>
        <Link href="/videos/new" className="btn btn-primary">＋ Добавить видео</Link>
      </div>

      <div className="toolbar">
        <input
          className="input grow"
          placeholder="Поиск по названию или тегам…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="input" value={privacy} onChange={(e) => setPrivacy(e.target.value)}>
          <option value="all">Все</option>
          {Object.entries(privacyLabels).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Видео</th>
              <th>Доступ</th>
              <th>Дата</th>
              <th className="num">Просмотры</th>
              <th className="num">Лайки</th>
              <th className="num">Коммент.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <tr key={v.id}>
                <td>
                  <Link href={`/videos/${v.id}`} className="video-cell">
                    <VideoThumb video={v} className="thumb-sm" />
                    <div>
                      <div className="video-title">{v.title}</div>
                      <div className="muted small clamp">
                        {v.description || 'Без описания'}
                      </div>
                    </div>
                  </Link>
                </td>
                <td><span className={`pill pill-${v.privacyStatus}`}>{privacyLabels[v.privacyStatus]}</span></td>
                <td className="nowrap">{formatDate(v.publishedAt)}</td>
                <td className="num">{formatNumber(v.statistics.viewCount)}</td>
                <td className="num">{formatNumber(v.statistics.likeCount)}</td>
                <td className="num">{formatNumber(v.statistics.commentCount)}</td>
                <td className="actions">
                  <Link href={`/videos/${v.id}`} className="btn btn-ghost">Изменить</Link>
                  <button className="btn btn-ghost danger" onClick={() => onDelete(v)}>Удалить</button>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td colSpan={7} className="muted empty">{loading ? 'Загрузка…' : 'Ничего не найдено'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
