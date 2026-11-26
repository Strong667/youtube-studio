import { json, readJson, route } from '@/server/http'
import { getChannel, updateChannel } from '@/server/youtube'

export const GET = route(async () => json(await getChannel()))

export const PATCH = route(async (request) => {
  const { description, keywords, country } = await readJson(request)
  return json(await updateChannel({ description, keywords, country }))
})
