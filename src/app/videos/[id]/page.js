import { Suspense } from 'react'
import VideoEditor from '@/components/views/VideoEditor'

export const metadata = { title: 'Редактирование видео' }

export default function Page() {
  return (
    <Suspense fallback={<p className="muted">Загрузка…</p>}>
      <VideoEditor />
    </Suspense>
  )
}
