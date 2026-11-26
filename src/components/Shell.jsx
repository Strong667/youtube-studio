'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useYouTube } from './YouTubeContext'
import { Avatar } from './Avatar'
import AuthScreen from './AuthScreen'

const links = [
  { href: '/', label: 'Панель', icon: '▦' },
  { href: '/videos', label: 'Видео', icon: '▶' },
  { href: '/videos/new', label: 'Добавить видео', icon: '＋' },
  { href: '/channel', label: 'Канал', icon: '◉' },
  { href: '/settings', label: 'Настройки', icon: '⚙' },
]

function isActive(pathname, href) {
  if (href === '/') return pathname === '/'
  if (href === '/videos') return pathname === '/videos' || (pathname.startsWith('/videos/') && pathname !== '/videos/new')
  return pathname === href
}

// usePathname читается в отдельном компоненте внутри <Suspense>,
// чтобы не блокировать предрендер страниц (cacheComponents в Next 16).
function ActiveNav({ onNavigate }) {
  return <NavLinks pathname={usePathname()} onNavigate={onNavigate} />
}

function NavLinks({ pathname, onNavigate }) {
  return (
    <nav>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`nav-link ${isActive(pathname, l.href) ? 'active' : ''}`}
          onClick={onNavigate}
        >
          <span className="nav-icon">{l.icon}</span>
          {l.label}
        </Link>
      ))}
    </nav>
  )
}

export default function Shell({ children }) {
  const { channel, mode, error, clearError } = useYouTube()
  const [open, setOpen] = useState(false)

  // Пока не вошли — вместо админки показываем экран входа.
  if (mode === 'loading') return <div className="auth-page muted">Загрузка…</div>
  if (mode === 'locked') return <AuthScreen />

  return (
    <div className="app">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-logo">▶</span>
          <span>Studio</span>
        </div>
        <Suspense fallback={<NavLinks pathname="" />}>
          <ActiveNav onNavigate={() => setOpen(false)} />
        </Suspense>
        {channel && (
          <div className="sidebar-channel">
            <Avatar channel={channel} size={36} />
            <div>
              <div className="sidebar-channel-name">{channel.title}</div>
              <div className="muted small">{channel.handle}</div>
            </div>
          </div>
        )}
      </aside>

      {open && <div className="backdrop" onClick={() => setOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Меню">
            ☰
          </button>
          {mode === 'google' ? (
            <span className="badge badge-ok">● YouTube подключён</span>
          ) : (
            <Link href="/settings" className="badge">Демо-режим · сервер не настроен</Link>
          )}
        </header>
        <main className="content">
          {error && (
            <div className="alert">
              <span className="grow">{error}</span>
              <button className="icon-btn" onClick={clearError} aria-label="Закрыть">×</button>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
