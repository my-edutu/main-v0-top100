import { readFileSync } from 'node:fs'

/** Read deployment secrets without exposing their contents to the browser. */
export function emailSecret(name: 'LISTMONK_API_TOKEN' | 'LISTMONK_GATEWAY_PASSWORD'): string | undefined {
  const file = process.env[`${name}_FILE`]
  if (file) {
    try { return readFileSync(file, 'utf8').trim() || undefined } catch { return undefined }
  }
  return process.env[name] || undefined
}
