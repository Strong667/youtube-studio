import { apiError, json, route } from '@/server/http'
import { setThumbnail } from '@/server/youtube'

const MAX = 2 * 1024 * 1024 // лимит YouTube для обложек

export const POST = route(async (request, { params }) => {
  const { id } = await params
  if (!/^[\w-]{6,32}$/.test(id)) return apiError('Неверный ID видео', 400)
  const type = request.headers.get('content-type') || ''
  if (!['image/jpeg', 'image/png'].includes(type)) return apiError('Обложка должна быть JPG или PNG', 400)
  const body = Buffer.from(await request.arrayBuffer())
  if (body.length > MAX) return apiError('Обложка больше 2 МБ', 400)
  await setThumbnail(id, body, type)
  return json({ ok: true })
})
