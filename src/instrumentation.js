// Выполняется один раз при старте сервера Next.js.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // На некоторых серверах IPv6 до Google не работает, а Node по умолчанию ждёт
    // всего 250 мс перед переходом на IPv4 — запросы к Google падают с ETIMEDOUT.
    const net = await import('node:net')
    net.setDefaultAutoSelectFamilyAttemptTimeout(1000)
  }
}
