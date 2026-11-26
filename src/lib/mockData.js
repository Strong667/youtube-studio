// Демо-данные. Используются, пока не подключён YouTube Data API.
// Структура полей повторяет ответы API (snippet / statistics / status),
// чтобы потом легко заменить источник данных.

export const mockChannel = {
  id: 'UC_demo_channel_id',
  title: 'Мой канал',
  handle: '@mychannel',
  description:
    'Здесь будет описание канала. Отредактируйте его на странице «Канал».',
  keywords: 'видео, обзоры, туториалы',
  country: 'KZ',
  avatar: '',
  banner: '',
  publishedAt: '2021-03-14T10:00:00Z',
  statistics: {
    subscriberCount: 12480,
    viewCount: 1543200,
    videoCount: 0, // считается автоматически
  },
}

export const mockVideos = [
  {
    id: 'vid_001',
    title: 'Как начать YouTube-канал в 2026 году',
    description:
      'Пошаговое руководство для новичков: оборудование, идеи, первые ролики.',
    tags: ['youtube', 'гайд', 'новичкам'],
    categoryId: '27',
    privacyStatus: 'public',
    thumbnail: '',
    publishedAt: '2026-11-10T15:00:00Z',
    duration: 'PT12M34S',
    statistics: { viewCount: 48210, likeCount: 3120, commentCount: 284 },
  },
  {
    id: 'vid_002',
    title: 'Монтаж видео: 10 советов',
    description: 'Ускоряем монтаж и делаем ролики динамичнее.',
    tags: ['монтаж', 'советы'],
    categoryId: '26',
    privacyStatus: 'public',
    thumbnail: '',
    publishedAt: '2026-10-28T12:00:00Z',
    duration: 'PT9M02S',
    statistics: { viewCount: 21980, likeCount: 1640, commentCount: 112 },
  },
  {
    id: 'vid_003',
    title: 'Закулисье канала (только по ссылке)',
    description: 'Видео для подписчиков спонсорской программы.',
    tags: ['закулисье'],
    categoryId: '22',
    privacyStatus: 'unlisted',
    thumbnail: '',
    publishedAt: '2026-10-15T09:30:00Z',
    duration: 'PT5M47S',
    statistics: { viewCount: 1320, likeCount: 210, commentCount: 18 },
  },
  {
    id: 'vid_004',
    title: 'Черновик: обзор новой камеры',
    description: '',
    tags: ['обзор', 'камера'],
    categoryId: '28',
    privacyStatus: 'private',
    thumbnail: '',
    publishedAt: '2026-11-20T18:00:00Z',
    duration: 'PT15M10S',
    statistics: { viewCount: 0, likeCount: 0, commentCount: 0 },
  },
]

// Категории YouTube (id — как в API videoCategories)
export const categories = [
  { id: '1', title: 'Фильмы и анимация' },
  { id: '2', title: 'Авто и транспорт' },
  { id: '10', title: 'Музыка' },
  { id: '15', title: 'Животные' },
  { id: '17', title: 'Спорт' },
  { id: '20', title: 'Игры' },
  { id: '22', title: 'Люди и блоги' },
  { id: '23', title: 'Юмор' },
  { id: '24', title: 'Развлечения' },
  { id: '25', title: 'Новости и политика' },
  { id: '26', title: 'Хобби и стиль' },
  { id: '27', title: 'Образование' },
  { id: '28', title: 'Наука и техника' },
]

export const privacyLabels = {
  public: 'Открытый доступ',
  unlisted: 'Доступ по ссылке',
  private: 'Ограниченный доступ',
}
