import { json, route } from '@/server/http'
import { listVideos } from '@/server/youtube'

export const GET = route(async () => json(await listVideos()))
