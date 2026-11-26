'use client'

import { useState, useSyncExternalStore } from 'react'
import { useYouTube } from '@/components/YouTubeContext'

const noop = () => () => {}

export default function Settings() {
  const yt = useYouTube()
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => '')
  const [busy, setBusy] = useState(false)

  const run = async (fn) => {
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Настройки</h1>
      </div>

      {yt.mode === 'google' ? (
        <section className="card form narrow">
          <div className="section-head">
            <h2>Подключение к YouTube</h2>
            <span className="pill pill-public">Подключено</span>
          </div>
          <p>
            {yt.channel && <>Канал <b>{yt.channel.title}</b>, </>}аккаунт Google <b>{yt.auth?.email}</b>.
            Доступ хранится на сервере и обновляется автоматически, вход — по коду Google Authenticator.
          </p>
          <div className="row wrap">
            <button className="btn" disabled={busy} onClick={() => run(yt.refresh)}>Обновить данные</button>
            <button className="btn" disabled={busy} onClick={() => run(yt.logout)}>Выйти на всех устройствах</button>
            <button
              className="btn danger"
              disabled={busy}
              onClick={() =>
                confirm('Отключить канал? Доступ у Google будет отозван, Authenticator придётся привязать заново.') &&
                run(yt.disconnect)
              }
            >
              Отключить канал
            </button>
          </div>
        </section>
      ) : (
        <ServerSetup missing={yt.auth?.missing ?? []} origin={origin} />
      )}

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

function ServerSetup({ missing, origin }) {
  const site = origin || 'http://localhost:3100'
  return (
    <section className="card form narrow">
      <div className="section-head">
        <h2>Настройка сервера</h2>
        <span className="pill pill-private">Не настроено</span>
      </div>
      <p className="muted">
        Сейчас работает демо-режим. Чтобы подключить настоящий канал, один раз настройте Google Cloud и файл{' '}
        <code>.env.local</code> на сервере.
      </p>
      {missing.length > 0 && (
        <p className="small">
          Не заполнено: {missing.map((m) => <code key={m}>{m}</code>).reduce((a, b) => [a, ' ', b])}
        </p>
      )}
      <ol className="steps">
        <li>
          Откройте <a className="link" href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noreferrer">Google Cloud Console</a> и создайте проект.
        </li>
        <li>В <b>APIs &amp; Services → Library</b> включите <b>YouTube Data API v3</b>.</li>
        <li>
          В <b>OAuth consent screen</b> выберите <b>External</b>, заполните название и переведите приложение в{' '}
          <b>In production</b> (в режиме Testing Google отзывает доступ каждые 7 дней).
        </li>
        <li>
          В <b>Credentials → Create credentials → OAuth client ID</b> выберите <b>Web application</b> и добавьте в{' '}
          <b>Authorized redirect URIs</b>: <code>{site}/api/auth/google/callback</code>
        </li>
        <li>
          Впишите в <code>.env.local</code>: <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code> и{' '}
          <code>ADMIN_EMAIL</code> (ваш Gmail — войти сможет только он). Затем перезапустите сервер.
        </li>
      </ol>
    </section>
  )
}
