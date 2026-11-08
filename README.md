# Secure Messaging

CS 4340 final project: a secure messaging system built over the semester.
This first step (Message Board) is a static web app that encrypts and decrypts
messages entirely in the browser with the Web Crypto API (`crypto.subtle`).
The passphrase and plaintext are never sent to a server.

## Team

- Kaden Baxter
- _TODO: add teammates_

## Running the project

Requires [Node.js](https://nodejs.org/) 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

- **Encrypt** page (`#/encrypt`): enter plaintext and a passphrase, click
  **Encrypt**, and copy the encrypted message.
- **Decrypt** page (`#/decrypt`): paste an encrypted message, enter the
  passphrase, and click **Decrypt** to get the plaintext back.

Other scripts: `npm run build` (production build to `dist/`), `npm run preview`
(serve the build), `npm run lint`.

Web Crypto only works in a secure context, so serve the app from `localhost`
or over HTTPS.

## Project layout

| File | Purpose |
|---|---|
| `src/crypto.js` | All encryption, decryption and message encoding |
| `src/pages/EncryptPage.jsx` | Encrypt page |
| `src/pages/DecryptPage.jsx` | Decrypt page |
| `src/App.jsx` | Navigation between the two pages (hash routing) |

## Crypto choices

| Decision | Choice | Why |
|---|---|---|
| Front end | React + Vite | A component framework that will scale to the later project steps; the crypto is plain `crypto.subtle` calls in `src/crypto.js` with no React dependency |
| Passphrase to key | PBKDF2 | The only password-based KDF built into Web Crypto. HKDF is built in too, but it is meant for high-entropy input, not passwords, because it does no key stretching. Using PBKDF2 avoids adding a third-party library |
| PBKDF2 hash | SHA-256 | Widely supported, and it is the hash the OWASP iteration recommendation is given for |
| Iterations | 600,000 | The OWASP recommendation for PBKDF2-HMAC-SHA256. Each passphrase guess costs an attacker 600,000 HMAC computations, and deriving the key takes a fraction of a second for a legitimate user |
| Cipher | AES-GCM | Authenticated encryption: unlike AES-CBC or AES-CTR, it detects tampering on its own, with no separate MAC needed |
| Key length | 128 bits | 128-bit AES has no practical brute-force attack. The real weak point is the passphrase, which PBKDF2 stretches, so a longer key would add little here |
| Salt | 16 random bytes, new for every message | Generated with `crypto.getRandomValues`, a CSPRNG. A unique salt stops precomputed (rainbow table) attacks and means the same passphrase gives a different key for each message. 16 bytes (128 bits) is the size NIST SP 800-132 recommends |
| IV | 12 random bytes, new for every message | 12 bytes (96 bits) is the standard IV size for AES-GCM. Because every message also has a fresh salt, every message has a fresh key as well, so an IV is never reused under the same key. IV reuse is catastrophic for GCM |
| Auth tag | 128 bits | The Web Crypto default and the maximum strength for GCM |
| Message format | Packed bytes, Base64-encoded, with a version byte | A single string that is easy to copy and paste. See the layout below |

### Encrypted message format (version 1)

The encrypted message is the following bytes, encoded as one standard Base64
string:

| Offset | Length | Field |
|---|---|---|
| 0 | 1 | Version (`0x01`) |
| 1 | 16 | PBKDF2 salt |
| 17 | 12 | AES-GCM IV |
| 29 | n + 16 | Ciphertext followed by the 16-byte GCM authentication tag |

- The **version byte** lets later project steps change the algorithms or
  layout while still recognizing old messages. Decryption rejects unknown
  versions with a clear error.
- The **header** (version, salt and IV) is passed to AES-GCM as *additional
  authenticated data*. It is not encrypted, but any change to it makes
  decryption fail. For example, an attacker cannot change the version byte
  without being detected.
- Decryption gives the same error for a wrong passphrase as for a tampered
  message, because AES-GCM cannot tell these cases apart.

### Handling keys and sensitive data in memory

- Derived keys are **non-extractable** `CryptoKey` objects. The raw key bytes
  never become available to JavaScript, and the key reference is dropped
  (`key = null`) as soon as the operation finishes.
- The byte buffers holding the encoded passphrase, the plaintext before
  encryption, and the plaintext after decryption are **overwritten with
  zeros** (`fill(0)`) right after use, including when an error occurs.
- JavaScript strings are immutable and cannot be wiped, so the UI **clears the
  passphrase field** after every encrypt or decrypt. Nothing is written to
  `localStorage`, cookies or the network.
