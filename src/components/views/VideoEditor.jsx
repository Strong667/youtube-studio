'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useYouTube } from '@/components/YouTubeContext'
import VideoThumb from '@/components/VideoThumb'
import { categories, privacyLabels } from '@/lib/mockData'

const empty = {
  title: '',
  description: '',
  tags: [],
  categoryId: '22',
  privacyStatus: 'private',
  thumbnail: '',
}

export default function VideoEditor() {
  const { id } = useParams()
  const router = useRouter()
  const yt = useYouTube()

  const existing = yt.videos.find((v) => v.id === id)

  if (id && !existing) {
    return <p className="muted">{yt.loading ? 'Загрузка…' : 'Видео не найдено'}</p>
  }

  return <EditorForm key={`${yt.mode}-${id ?? 'new'}`} id={id} existing={existing} router={router} yt={yt} />
}

function EditorForm({ id, existing, router, yt }) {
  const isNew = !id
  const isGoogle = yt.mode === 'google'
  const [form, setForm] = useState(() => ({ ...empty, ...existing }))
  const [tagInput, setTagInput] = useState('')
  const [file, setFile] = useState(null)
  const [thumbFile, setThumbFile] = useState(null)
  const [thumbPreview, setThumbPreview] = useState('')
  const [progress, setProgress] = useState(null)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const addTag = () => {
    const t = tagInput.trim().replace(/,$/, '')
    if (t && !form.tags.includes(t)) setForm((f) => ({ ...f, tags: [...f.tags, t] }))
    setTagInput('')
  }

  const pickThumb = (e) => {
    const f = e.target.files[0] ?? null
    setThumbFile(f)
    if (thumbPreview) URL.revokeObjectURL(thumbPreview)
    setThumbPreview(f ? URL.createObjectURL(f) : '')
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (isNew && isGoogle && !file) {
      setStatus('Выберите видеофайл для загрузки')
      return
    }
    setSaving(true)
    setStatus('')
    const data = {
      title: form.title.trim(),
      description: form.description,
      tags: form.tags,
      categoryId: form.categoryId,
      privacyStatus: form.privacyStatus,
      thumbnail: form.thumbnail.trim(),
    }
    try {
      let videoId = id
      if (isNew) {
        if (isGoogle) setProgress(0)
        const v = await yt.createVideo(data, file, setProgress)
        videoId = v.id
      } else {
        await yt.updateVideo(id, data)
      }
      if (thumbFile && yt.canSetThumbnailFile) {
        try {
          await yt.setThumbnail(videoId, thumbFile)
        } catch (err) {
          setStatus(`Видео сохранено, но обложка не загружена: ${err.message}`)
          if (isNew) router.replace(`/videos/${videoId}`)
          return
        }
      }
      if (isNew) {
        router.replace(`/videos/${videoId}`)
      } else {
        setStatus('✓ Сохранено')
        setTimeout(() => setStatus(''), 2000)
      }
    } catch (err) {
      setStatus(err.message)
    } finally {
      setSaving(false)
      setProgress(null)
    }
  }

  const buttonLabel = saving
    ? progress != null && progress < 1
      ? `Загрузка ${Math.round(progress * 100)}%`
      : 'Сохранение…'
    : isNew
      ? isGoogle ? 'Загрузить на YouTube' : 'Создать'
      : 'Сохранить'

  return (
    <>
      <div className="page-head">
        <h1>{isNew ? 'Новое видео' : 'Редактирование видео'}</h1>
        {isGoogle && existing && (
          <a className="btn" href={`https://youtu.be/${existing.id}`} target="_blank" rel="noreferrer">
            Открыть на YouTube ↗
          </a>
        )}
      </div>

      <form className="editor" onSubmit={onSubmit}>
        <div className="card form">
          {isNew && (
            <label className="field">
              <span>Видеофайл</span>
              <div className="dropzone">
                <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files[0] ?? null)} />
                <div>{file ? `📁 ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} МБ)` : 'Выберите файл или перетащите сюда'}</div>
                <div className="muted small">
                  {isGoogle
                    ? 'Файл будет загружен на ваш канал. Не закрывайте вкладку до конца загрузки.'
                    : 'В демо-режиме файл не загружается — сохраняются только данные. Подключите канал в «Настройках».'}
                </div>
              </div>
              {progress != null && (
                <div className="progress"><div style={{ width: `${Math.round(progress * 100)}%` }} /></div>
              )}
            </label>
          )}

          <label className="field">
            <span>Название <em className="muted">({form.title.length}/100)</em></span>
            <input className="input" required maxLength={100} value={form.title} onChange={set('title')} />
          </label>

          <label className="field">
            <span>Описание <em className="muted">({form.description.length}/5000)</em></span>
            <textarea className="input" rows={8} maxLength={5000} value={form.description} onChange={set('description')} />
          </label>

          <div className="field">
            <span>Теги</span>
            <div className="tags-input">
              {form.tags.map((t) => (
                <span key={t} className="tag">
                  {t}
                  <button type="button" onClick={() => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }))}>×</button>
                </span>
              ))}
              <input
                placeholder="Введите тег и нажмите Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    addTag()
                  }
                }}
                onBlur={addTag}
              />
            </div>
          </div>
        </div>

        <aside className="editor-side">
          <div className="card form">
            <VideoThumb video={{ ...existing, ...form, thumbnail: thumbPreview || form.thumbnail }} />
            {yt.canSetThumbnailFile ? (
              <label className="field">
                <span>Обложка (JPG/PNG, до 2 МБ)</span>
                <input className="input" type="file" accept="image/jpeg,image/png" onChange={pickThumb} />
              </label>
            ) : (
              <label className="field">
                <span>URL обложки</span>
                <input className="input" placeholder="https://…" value={form.thumbnail} onChange={set('thumbnail')} />
              </label>
            )}
            <label className="field">
              <span>Доступ</span>
              <select className="input" value={form.privacyStatus} onChange={set('privacyStatus')}>
                {Object.entries(privacyLabels).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Категория</span>
              <select className="input" value={form.categoryId} onChange={set('categoryId')}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </label>
            {existing && <div className="muted small">ID: {existing.id}</div>}
          </div>

          <div className="row">
            <button type="button" className="btn" onClick={() => router.push('/videos')} disabled={saving}>Назад</button>
            <button className="btn btn-primary grow" disabled={saving}>{buttonLabel}</button>
          </div>
          {status && <p className="muted small">{status}</p>}
        </aside>
      </form>
    </>
  )
}
