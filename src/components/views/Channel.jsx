'use client'

import { useState } from 'react'
import { useYouTube } from '@/components/YouTubeContext'
import { Avatar } from '@/components/Avatar'

export default function Channel() {
  const { channel, loading, mode, updateChannel } = useYouTube()
  if (!channel) return <p className="muted">{loading ? 'Загрузка…' : 'Нет данных канала'}</p>
  return <ChannelForm key={`${mode}-${channel.id}`} channel={channel} isGoogle={mode === 'google'} updateChannel={updateChannel} />
}

function ChannelForm({ channel, isGoogle, updateChannel }) {
  const [form, setForm] = useState(channel)
  const [status, setStatus] = useState('')

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setStatus('Сохранение…')
    try {
      const { title, handle, description, keywords, country, avatar } = form
      await updateChannel({ title, handle, description, keywords, country, avatar })
      setStatus('✓ Сохранено')
      setTimeout(() => setStatus(''), 2000)
    } catch (err) {
      setStatus(err.message)
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Настройки канала</h1>
        {isGoogle && (
          <a className="btn" href={`https://studio.youtube.com/channel/${channel.id}/editing/profile`} target="_blank" rel="noreferrer">
            Открыть в YouTube Studio ↗
          </a>
        )}
      </div>
      <form className="card form narrow" onSubmit={onSubmit}>
        {isGoogle && (
          <p className="muted small">
            Название, псевдоним и аватар YouTube API менять не позволяет — для них используйте YouTube Studio.
          </p>
        )}
        <div className="row">
          <Avatar channel={form} size={64} />
          <label className="field grow">
            <span>URL аватара</span>
            <input className="input" placeholder="https://…" value={form.avatar} onChange={set('avatar')} disabled={isGoogle} />
          </label>
        </div>
        <label className="field">
          <span>Название канала</span>
          <input className="input" required value={form.title} onChange={set('title')} disabled={isGoogle} />
        </label>
        <label className="field">
          <span>Псевдоним (handle)</span>
          <input className="input" value={form.handle} onChange={set('handle')} disabled={isGoogle} />
        </label>
        <label className="field">
          <span>Описание</span>
          <textarea className="input" rows={6} maxLength={1000} value={form.description} onChange={set('description')} />
        </label>
        <label className="field">
          <span>Ключевые слова</span>
          <input className="input" value={form.keywords} onChange={set('keywords')} />
        </label>
        <label className="field">
          <span>Страна (код из 2 букв, например KZ)</span>
          <input className="input" maxLength={2} value={form.country} onChange={set('country')} />
        </label>
        <div className="row">
          <button className="btn btn-primary">Сохранить</button>
          <span className="muted">{status}</span>
        </div>
      </form>
    </>
  )
}
