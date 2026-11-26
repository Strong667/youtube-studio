import { baseUrl } from '@/server/config'
import { apiError, json, readJson, route } from '@/server/http'
import { startUpload } from '@/server/youtube'

// Возвращает одноразовую ссылку, по которой браузер загрузит файл прямо в YouTube.
export const POST = route(async (request) => {
  const body = await readJson(request)
  const fileSize = Number(body.fileSize)
  if (!body.title?.trim()) return apiError('Укажите название видео', 400)
  if (!Number.isFinite(fileSize) || fileSize <= 0) return apiError('Не указан размер файла', 400)
  if (body.fileType && !String(body.fileType).startsWith('video/')) return apiError('Это не видеофайл', 400)
  const uploadUrl = await startUpload(body, { fileType: body.fileType, fileSize, origin: baseUrl(request) })
  return json({ uploadUrl })
})
