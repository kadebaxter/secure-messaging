import { useState } from 'react'
import { encryptMessage } from '../crypto.js'
import { useCryptoAction } from '../useCryptoAction.js'

export default function EncryptPage() {
  const [plaintext, setPlaintext] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [copied, setCopied] = useState(false)

  const [state, formAction, pending] = useCryptoAction((formData) => {
    setPassphrase('') // don't keep the passphrase in component state after use
    setCopied(false)
    return encryptMessage(formData.get('plaintext'), formData.get('passphrase'))
  })

  return (
    <form action={formAction}>
      <h2>Encrypt a message</h2>

      <label htmlFor="enc-plaintext">Plaintext</label>
      <textarea
        id="enc-plaintext"
        name="plaintext"
        rows={6}
        value={plaintext}
        onChange={(e) => setPlaintext(e.target.value)}
      />

      <label htmlFor="enc-passphrase">Passphrase</label>
      <input
        id="enc-passphrase"
        name="passphrase"
        type="password"
        autoComplete="new-password"
        value={passphrase}
        onChange={(e) => setPassphrase(e.target.value)}
        required
      />

      <button type="submit" disabled={pending || !passphrase}>
        {pending ? 'Encrypting…' : 'Encrypt'}
      </button>

      {state.error && <p className="error" role="alert">{state.error}</p>}

      {state.output && (
        <>
          <label htmlFor="enc-result">Encrypted message (version + salt + IV + ciphertext, Base64)</label>
          <textarea id="enc-result" rows={6} value={state.output} readOnly className="mono" />
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(state.output).then(() => setCopied(true))}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </>
      )}
    </form>
  )
}
