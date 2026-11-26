# YouTube Studio — панель управления каналом

Next.js 16 (App Router) + React 19.

```bash
npm install
npm run dev
```

## Страницы
- `/` — панель: статистика канала, последние и популярные видео
- `/videos` — список видео с поиском и фильтром по доступу
- `/videos/new` — добавление видео (название, описание, теги, категория, доступ, обложка)
- `/videos/[id]` — редактирование видео
- `/channel` — данные канала
- `/settings` — подключение к YouTube, сброс демо-данных

## Вход и доступ к YouTube

1. Один раз: создайте OAuth client (Web application) в Google Cloud Console, включите
   YouTube Data API v3, добавьте redirect URI `<адрес сайта>/api/auth/google/callback`
   и заполните `.env.local` (шаблон — `.env.local.example`).
2. Первый вход — через Google (пускается только `ADMIN_EMAIL`). Сервер сохраняет
   refresh token в зашифрованном `.data/store.json`.
3. Затем сайт показывает QR-код для Google Authenticator.
4. Дальше вход — только 6-значным кодом. Сессия живёт 7 дней.

Потеряли телефон — «Войти через Google» на экране входа позволяет привязать Authenticator заново.

Пока `.env.local` не заполнен, сайт работает в демо-режиме (данные в `localStorage`).

## Устройство
- `src/server/` — серверная часть: хранилище, сессии, TOTP, Google OAuth, YouTube API
- `src/app/api/` — API-маршруты (`/api/auth/*`, `/api/youtube/*`)
- `src/lib/serverApi.js` — клиент для этих маршрутов
