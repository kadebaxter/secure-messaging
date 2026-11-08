export const VERSION = 1
export const PBKDF2_ITERATIONS = 600_000
export const PBKDF2_HASH = 'SHA-256'
export const KEY_LENGTH_BITS = 128
export const SALT_LENGTH = 16
export const IV_LENGTH = 12
const TAG_LENGTH = 16
const HEADER_LENGTH = 1 + SALT_LENGTH + IV_LENGTH

export class CryptoError extends Error {
  name = 'CryptoError'
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

// Standard Base64 with correct padding, the exact form btoa() produces.
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/

async function deriveKey(passphrase, salt) {
  // importKey copies the bytes, so ours can be wiped as soon as it settles.
  const passphraseBytes = encoder.encode(passphrase)
  const baseKey = await crypto.subtle
    .importKey('raw', passphraseBytes, 'PBKDF2', false, ['deriveKey'])
    .finally(() => passphraseBytes.fill(0))

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH },
    baseKey,
    { name: 'AES-GCM', length: KEY_LENGTH_BITS },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptMessage(plaintext, passphrase) {
  if (!passphrase) throw new CryptoError('Passphrase is required.')

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const header = Uint8Array.of(VERSION, ...salt, ...iv)

  const key = await deriveKey(passphrase, salt)
  const plainBytes = encoder.encode(plaintext)
  const ciphertext = await crypto.subtle
    .encrypt({ name: 'AES-GCM', iv, additionalData: header }, key, plainBytes)
    .finally(() => plainBytes.fill(0))

  const out = new Uint8Array(HEADER_LENGTH + ciphertext.byteLength)
  out.set(header)
  out.set(new Uint8Array(ciphertext), HEADER_LENGTH)
  return bytesToBase64(out)
}

export async function decryptMessage(encoded, passphrase) {
  if (!passphrase) throw new CryptoError('Passphrase is required.')

  const b64 = encoded.replace(/\s/g, '') // tolerate line breaks from copy/paste
  if (!BASE64_PATTERN.test(b64)) {
    throw new CryptoError('Encrypted message is not valid Base64.')
  }
  const bytes = base64ToBytes(b64)
  if (bytes.length < HEADER_LENGTH + TAG_LENGTH) {
    throw new CryptoError('Encrypted message is too short.')
  }
  if (bytes[0] !== VERSION) {
    throw new CryptoError(`Unsupported message version: ${bytes[0]}.`)
  }

  const header = bytes.subarray(0, HEADER_LENGTH)
  const salt = bytes.subarray(1, 1 + SALT_LENGTH)
  const iv = bytes.subarray(1 + SALT_LENGTH, HEADER_LENGTH)
  const ciphertext = bytes.subarray(HEADER_LENGTH)

  const key = await deriveKey(passphrase, salt)
  const plainBytes = new Uint8Array(
    await crypto.subtle
      .decrypt({ name: 'AES-GCM', iv, additionalData: header }, key, ciphertext)
      .catch((err) => {
        // A failed GCM tag check is an OperationError. AES-GCM can't tell a
        // wrong key from tampered data. Any other error is a bug: rethrow it.
        if (err.name !== 'OperationError') throw err
        throw new CryptoError('Decryption failed: wrong passphrase or the message was modified.')
      }),
  )
  const plaintext = decoder.decode(plainBytes) // non-fatal decoder: never throws
  plainBytes.fill(0)
  return plaintext
}

function bytesToBase64(bytes) {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function base64ToBytes(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}
