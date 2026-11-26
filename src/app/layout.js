import './globals.css'
import { YouTubeProvider } from '@/components/YouTubeContext'
import Shell from '@/components/Shell'

export const metadata = {
  title: { default: 'YouTube Studio', template: '%s · YouTube Studio' },
  description: 'Управление YouTube-каналом',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>
        <YouTubeProvider>
          <Shell>{children}</Shell>
        </YouTubeProvider>
      </body>
    </html>
  )
}
