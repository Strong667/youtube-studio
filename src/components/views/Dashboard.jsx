'use client'

import Link from 'next/link'
import { useYouTube } from '@/components/YouTubeContext'
import { Avatar } from '@/components/Avatar'
import VideoThumb from '@/components/VideoThumb'
import { formatDate, formatNumber } from '@/lib/format'
import { privacyLabels } from '@/lib/mockData'

export default function Dashboard() {
  const { channel, videos, loading } = useYouTube()
  if (!channel) return <p className="muted">{loading ? 'Загрузка…' : 'Нет данных канала'}</p>

  const totals = videos.reduce(
    (acc, v) => ({
      likes: acc.likes + v.statistics.likeCount,
      comments: acc.comments + v.statistics.commentCount,
    }),
    { likes: 0, comments: 0 },
  )
  const top = [...videos]
    .sort((a, b) => b.statistics.viewCount - a.statistics.viewCount)
    .slice(0, 3)

  return (
    <>
      <div className="channel-header card">
        <Avatar channel={channel} size={72} />
        <div className="grow">
          <h1>{channel.title}</h1>
          <div className="muted">
            {channel.handle} · на YouTube с {formatDate(channel.publishedAt)}
          </div>
        </div>
        <Link href="/videos/new" className="btn btn-primary">
          ＋ Добавить видео
        </Link>
      </div>

      <div className="stats">
        <Stat label="Подписчики" value={channel.statistics.subscriberCount} />
        <Stat label="Просмотры" value={channel.statistics.viewCount} />
        <Stat label="Видео" value={channel.statistics.videoCount} />
        <Stat label="Лайки" value={totals.likes} />
        <Stat label="Комментарии" value={totals.comments} />
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="section-head">
            <h2>Последние видео</h2>
            <Link href="/videos">Все видео →</Link>
          </div>
          <ul className="video-mini-list">
            {videos.slice(0, 4).map((v) => (
              <li key={v.id}>
                <Link href={`/videos/${v.id}`} className="video-mini">
                  <VideoThumb video={v} className="thumb-sm" />
                  <div className="grow">
                    <div className="video-title">{v.title}</div>
                    <div className="muted small">
                      {formatDate(v.publishedAt)} · {privacyLabels[v.privacyStatus]}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
            {!videos.length && <li className="muted">Видео пока нет</li>}
          </ul>
        </section>

        <section className="card">
          <h2>Топ по просмотрам</h2>
          <ol className="top-list">
            {top.map((v) => (
              <li key={v.id}>
                <span className="video-title">{v.title}</span>
                <strong>{formatNumber(v.statistics.viewCount)}</strong>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  )
}

function Stat({ label, value }) {
  return (
    <div className="card stat">
      <div className="muted small">{label}</div>
      <div className="stat-value">{formatNumber(value)}</div>
    </div>
  )
}
