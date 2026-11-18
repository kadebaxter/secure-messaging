// Talks to server.js. Only the Base64 encrypted message (version + salt + IV +
// ciphertext) and an optional index are ever sent; never the passphrase.

async function request(url, options) {
  const res = await fetch(url, options)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status}).`)
  return body
}

export function saveMessage(ciphertext, index) {
  return request('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ciphertext, index: index || undefined }),
  })
}

export function lookupMessage(index) {
  return request(`/api/messages/${encodeURIComponent(index)}`)
}
