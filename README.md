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

## Данные
Сейчас работает демо-режим: данные в `localStorage` (`src/lib/youtube.js`).
Чтобы подключить настоящий канал, функции в этом файле заменяются на вызовы
YouTube Data API v3 (`channels.list`, `videos.list/insert/update/delete`) с OAuth 2.0.
