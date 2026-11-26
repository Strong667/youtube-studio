'use client'

import { useState, useSyncExternalStore } from 'react'
import { useYouTube } from '@/components/YouTubeContext'

const noop = () => () => {}

export default function Settings() {
  const yt = useYouTube()
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => '')
  const [draftId, setDraftId] = useState(null) // null — показываем сохранённое значение
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const shownId = draftId ?? yt.clientId

  const connect = async () => {
    setBusy(true)
    setMessage('')
    try {
      await yt.signIn()
    } catch (e) {
      setMessage(e.message)
    } finally {
      setBusy(false)
    }
  }

  const saveId = (e) => {
    e.preventDefault()
    yt.setClientId(shownId)
    setDraftId(null)
    setMessage('Client ID сохранён')
  }

  return (
    <>
      <div className="page-head">
        <h1>Настройки</h1>
      </div>

      <section className="card form narrow">
        <div className="section-head">
          <h2>Подключение к YouTube</h2>
          <span className={`pill ${yt.mode === 'google' ? 'pill-public' : 'pill-private'}`}>
            {yt.mode === 'google' ? 'Подключено' : 'Не подключено'}
          </span>
        </div>

        {yt.mode === 'google' ? (
          <>
            <p>
              Подключён канал <b>{yt.channel?.title}</b>. Все изменения сразу применяются на YouTube.
            </p>
            <div className="row">
              <button className="btn" onClick={yt.refresh}>Обновить данные</button>
              <button className="btn danger" onClick={yt.signOut}>Отключить</button>
            </div>
          </>
        ) : (
          <>
            {!yt.clientIdFromEnv && (
              <form className="field" onSubmit={saveId}>
                <span>OAuth Client ID</span>
                <div className="row">
                  <input
                    className="input grow"
                    placeholder="123456789-abc.apps.googleusercontent.com"
                    value={shownId}
                    onChange={(e) => setDraftId(e.target.value)}
                  />
                  <button className="btn" disabled={draftId === null}>Сохранить</button>
                </div>
              </form>
            )}
            <div>
              <button className="btn btn-primary" onClick={connect} disabled={!yt.clientId || busy}>
                {busy ? 'Ожидание входа…' : 'Войти через Google'}
              </button>
            </div>
          </>
        )}
        {message && <p className="muted small">{message}</p>}
      </section>

      <section className="card form narrow">
        <h2>Как получить Client ID</h2>
        <ol className="steps">
          <li>
            Откройте <a className="link" href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noreferrer">Google Cloud Console</a> и создайте проект.
          </li>
          <li>
            В разделе <b>APIs &amp; Services → Library</b> найдите и включите <b>YouTube Data API v3</b>.
          </li>
          <li>
            В <b>OAuth consent screen</b> выберите тип <b>External</b>, заполните название и добавьте свой
            Gmail в <b>Test users</b>.
          </li>
          <li>
            В <b>Credentials → Create credentials → OAuth client ID</b> выберите <b>Web application</b> и в{' '}
            <b>Authorized JavaScript origins</b> добавьте адрес: <code>{origin || 'http://localhost:3100'}</code>
          </li>
          <li>Скопируйте Client ID и вставьте его выше (или в файл <code>.env.local</code>).</li>
        </ol>
      </section>

      {yt.mode === 'demo' && (
        <section className="card form narrow">
          <h2>Демо-данные</h2>
          <p className="muted">Вернуть демо-канал и видео к исходным примерам.</p>
          <div>
            <button className="btn danger" onClick={() => confirm('Сбросить все изменения?') && yt.resetDemo()}>
              Сбросить демо-данные
            </button>
          </div>
        </section>
      )}
    </>
  )
}
