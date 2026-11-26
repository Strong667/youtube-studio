import { apiError, json, readJson, route } from '@/server/http'
import { deleteVideo, updateVideo } from '@/server/youtube'

const validId = (id) => /^[\w-]{6,32}$/.test(id)

export const PATCH = route(async (request, { params }) => {
  const { id } = await params
  if (!validId(id)) return apiError('Неверный ID видео', 400)
  const { title, description, tags, categoryId, privacyStatus } = await readJson(request)
  await updateVideo(id, {
    title: title?.trim().slice(0, 100),
    description: description?.slice(0, 5000),
    tags: Array.isArray(tags) ? tags.map(String) : undefined,
    categoryId: categoryId ? String(categoryId) : undefined,
    privacyStatus: ['public', 'unlisted', 'private'].includes(privacyStatus) ? privacyStatus : undefined,
  })
  return json({ ok: true })
})

export const DELETE = route(async (request, { params }) => {
  const { id } = await params
  if (!validId(id)) return apiError('Неверный ID видео', 400)
  await deleteVideo(id)
  return json({ ok: true })
})
