import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
const directory = process.argv[2]
if (!directory) throw new Error('A generated harness directory is required')
const files = { '/': ['index.html', 'text/html'], '/harness.js': ['harness.js', 'text/javascript'], '/harness.css': ['harness.css', 'text/css'] }
const server = createServer((request, response) => {
  const file = files[new URL(request.url, 'http://127.0.0.1:4173').pathname]
  if (!file) { response.writeHead(404); response.end('Synthetic harness: resource not served'); return }
  response.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
  response.end(readFileSync(join(directory, file[0])))
})
server.listen(4173, '127.0.0.1')
process.on('SIGTERM', () => server.close(() => process.exit(0)))
