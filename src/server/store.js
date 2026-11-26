// Зашифрованное хранилище на диске: refresh token Google и секрет Authenticator.
// Файл .data/store.json шифруется AES-256-GCM ключом из APP_SECRET.

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { config } from './config'

const DIR = path.join(process.cwd(), '.data')
const FILE = path.join(DIR, 'store.json')

const empty = () => ({
  sessionVersion: 1, // увеличивается при выходе — все старые сессии становятся недействительными
  google: null, // { refreshToken, email, connectedAt }
  totp: null, // { secret, enabled, lastCounter }
  pendingTotpSecret: null,
})

function key() {
  return crypto.createHash('sha256').update(`store:${config.appSecret}`).digest()
}

function encrypt(obj) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const data = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()])
  return JSON.stringify({
    v: 1,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: data.toString('base64'),
  })
}

function decrypt(text) {
  const { iv, tag, data } = JSON.parse(text)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  const plain = Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()])
  return JSON.parse(plain.toString('utf8'))
}

export async function readStore() {
  try {
    return { ...empty(), ...decrypt(await fs.readFile(FILE, 'utf8')) }
  } catch (e) {
    if (e.code === 'ENOENT') return empty()
    // Сменили APP_SECRET или файл повреждён — начинаем заново.
    console.error('[store] не удалось прочитать хранилище:', e.message)
    return empty()
  }
}

async function writeStore(obj) {
  await fs.mkdir(DIR, { recursive: true, mode: 0o700 })
  const tmp = `${FILE}.${process.pid}.tmp`
  await fs.writeFile(tmp, encrypt(obj), { mode: 0o600 })
  await fs.rename(tmp, FILE)
}

// Изменения выполняются по очереди, чтобы параллельные запросы не затирали друг друга.
let queue = Promise.resolve()

export function updateStore(fn) {
  const run = queue.then(async () => {
    const current = await readStore()
    const next = (await fn(current)) ?? current
    await writeStore(next)
    return next
  })
  queue = run.catch(() => {})
  return run
}
