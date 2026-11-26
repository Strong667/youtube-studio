'use client'

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState, useSyncExternalStore } from 'react'
import { useYouTube } from './YouTubeContext'
import { authApi } from '@/lib/serverApi'

const authErrors = {
  wrong_account: 'Этот Google-аккаунт не совпадает с ADMIN_EMAIL на сервере.',
  access_denied: 'Вы отменили доступ в окне Google.',
  state_mismatch: 'Сессия входа устарела — попробуйте ещё раз.',
  exchange_failed: 'Google не принял код входа. Проверьте Client Secret и Redirect URI.',
  no_refresh_token: 'Google не выдал постоянный ключ. Отзовите доступ в настройках аккаунта Google и войдите снова.',
  google_error: 'Google вернул ошибку при входе.',
  missing_scope:
    'Google не выдал доступ к YouTube. Нажмите «Войти через Google» ещё раз и на странице разрешений отметьте галочку «Управление аккаунтом YouTube».',
  not_configured: 'Сервер не настроен.',
}

const noop = () => () => {}

export default function AuthScreen() {
  const { auth, error } = useYouTube()
  const urlError = useSyncExternalStore(
    noop,
    () => new URLSearchParams(window.location.search).get('auth_error'),
    () => null,
  )
  const message = (urlError && (authErrors[urlError] || urlError)) || error

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <div className="brand auth-brand">
          <span className="brand-logo">▶</span>
          <span>Studio</span>
        </div>
        {message && <div className="alert">{message}</div>}
        {!auth.connected ? <ConnectGoogle /> : auth.stage === 'setup' ? <TotpSetup /> : <CodeLogin />}
      </div>
    </div>
  )
}

function ConnectGoogle() {
  return (
    <>
      <h1>Подключите YouTube</h1>
      <p className="muted">
        Войдите через Google один раз — сайт сохранит доступ к каналу на сервере. Потом будете входить кодом из
        Google Authenticator.
      </p>
      <a className="btn btn-primary btn-block" href="/api/auth/google">Войти через Google</a>
    </>
  )
}

function TotpSetup() {
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    authApi.totpSetup().then(setData, (e) => setLoadError(e.message))
  }, [])

  return (
    <>
      <h1>Привяжите Authenticator</h1>
      <ol className="steps">
        <li>Откройте Google Authenticator и нажмите «+» → «Сканировать QR-код».</li>
        <li>Отсканируйте код ниже и введите 6 цифр из приложения.</li>
      </ol>
      <div className="qr">
        {data ? <img src={data.qr} alt="QR-код для Google Authenticator" width={240} height={240} /> : <span className="muted">{loadError || 'Загрузка…'}</span>}
      </div>
      {data && (
        <details className="muted small">
          <summary>Не получается отсканировать?</summary>
          Введите ключ вручную: <code className="secret">{data.secret.match(/.{1,4}/g).join(' ')}</code>
        </details>
      )}
      <CodeForm label="Подтвердить" />
    </>
  )
}

function CodeLogin() {
  const { auth, resetTotp } = useYouTube()
  const [resetting, setResetting] = useState(false)

  return (
    <>
      <h1>Вход</h1>
      <p className="muted">Введите 6-значный код из Google Authenticator.</p>
      <CodeForm label="Войти" />
      {auth.stage === 'google' ? (
        <button
          className="btn btn-ghost btn-block"
          disabled={resetting}
          onClick={async () => {
            if (!confirm('Привязать Authenticator заново? Старые коды перестанут работать.')) return
            setResetting(true)
            await resetTotp().finally(() => setResetting(false))
          }}
        >
          Потерял телефон — привязать Authenticator заново
        </button>
      ) : (
        <a className="btn btn-ghost btn-block" href="/api/auth/google">Нет доступа к телефону? Войти через Google</a>
      )}
    </>
  )
}

function CodeForm({ label }) {
  const { verifyCode } = useYouTube()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (value) => {
    if (busy || value.length !== 6) return
    setBusy(true)
    setErr('')
    try {
      await verifyCode(value)
      // убираем ?auth_error из адреса после успешного входа
      if (window.location.search) window.history.replaceState(null, '', window.location.pathname)
    } catch (e) {
      setErr(e.message)
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault()
        submit(code)
      }}
    >
      <input
        className="input code-input"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="000000"
        maxLength={6}
        autoFocus
        value={code}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, '').slice(0, 6)
          setCode(v)
          if (v.length === 6) submit(v)
        }}
      />
      {err && <div className="small danger">{err}</div>}
      <button className="btn btn-primary btn-block" disabled={busy || code.length !== 6}>
        {busy ? 'Проверка…' : label}
      </button>
    </form>
  )
}
