// Message storage server. It never sees a passphrase or plaintext and never
// decrypts anything: it only stores and returns the Base64 encrypted message
// (version + salt + IV + ciphertext) produced in the browser.
//
// Uses only Node built-ins (node:http, node:sqlite), so there is nothing extra
// to install. Run with: node server.js
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import { DatabaseSync } from 'node:sqlite'

const PORT = 3001
const MAX_BODY_BYTES = 100_000 // whole JSON request
const MAX_CIPHERTEXT_LENGTH = 70_000 // Base64 chars (~50 KB of encrypted data)
const MIN_CIPHERTEXT_LENGTH = 60 // header (29 bytes) + tag (16 bytes), Base64-encoded
const INDEX_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/

const db = new DatabaseSync('messages.db')
db.exec(`CREATE TABLE IF NOT EXISTS messages (
  id         TEXT PRIMARY KEY,
  ciphertext TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`)

// Parameterized queries only: user input is never pasted into SQL text.
const insertMessage = db.prepare('INSERT INTO messages (id, ciphertext) VALUES (?, ?)')
const selectMessage = db.prepare('SELECT ciphertext FROM messages WHERE id = ?')

// 12 random bytes -> 16 URL-safe characters (96 bits, not guessable).
const generateIndex = () => randomBytes(12).toString('base64url')

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

async function readJson(req) {
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new Error('Request is too large.')
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new Error('Request body must be JSON.')
  }
}

async function saveMessage(req, res) {
  let body
  try {
    body = await readJson(req)
  } catch (err) {
    return send(res, 400, { error: err.message })
  }

  const { ciphertext } = body ?? {}
  if (
    typeof ciphertext !== 'string' ||
    ciphertext.length < MIN_CIPHERTEXT_LENGTH ||
    ciphertext.length > MAX_CIPHERTEXT_LENGTH ||
    !BASE64_PATTERN.test(ciphertext)
  ) {
    return send(res, 400, { error: 'Cipher text must be valid Base64 of a reasonable size.' })
  }

  const userIndex = body.index
  if (userIndex != null && userIndex !== '') {
    if (typeof userIndex !== 'string' || !INDEX_PATTERN.test(userIndex)) {
      return send(res, 400, { error: 'Index must be 1-64 characters: letters, digits, - or _.' })
    }
  }
  const index = userIndex || generateIndex()

  try {
    insertMessage.run(index, ciphertext)
  } catch (err) {
    if (err.errcode === 1555 /* SQLITE_CONSTRAINT_PRIMARYKEY */) {
      return send(res, 409, { error: 'That index is already taken.' })
    }
    throw err
  }
  send(res, 201, { index })
}

function getMessage(res, index) {
  if (!INDEX_PATTERN.test(index)) return send(res, 400, { error: 'Invalid index.' })
  const row = selectMessage.get(index)
  if (!row) return send(res, 404, { error: 'No message with that index.' })
  send(res, 200, { index, ciphertext: row.ciphertext })
}

const server = createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://localhost')
    if (req.method === 'POST' && pathname === '/api/messages') {
      return await saveMessage(req, res)
    }
    const match = pathname.match(/^\/api\/messages\/([^/]+)$/)
    if (req.method === 'GET' && match) {
      return getMessage(res, decodeURIComponent(match[1]))
    }
    send(res, 404, { error: 'Not found.' })
  } catch (err) {
    console.error(err)
    if (!res.headersSent) send(res, 500, { error: 'Server error.' })
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`API server listening on http://localhost:${PORT}`)
})
