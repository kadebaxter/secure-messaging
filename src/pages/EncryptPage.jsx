import { useState } from 'react'
import { saveMessage } from '../api.js'
import { encryptMessage } from '../crypto.js'
import { useCryptoAction } from '../useCryptoAction.js'

export default function EncryptPage() {
  const [plaintext, setPlaintext] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [copied, setCopied] = useState(false)
  const [index, setIndex] = useState('')
  const [saved, setSaved] = useState({})

  async function handleSave() {
    try {
      setSaved({ index: (await saveMessage(state.output, index.trim())).index })
    } catch (err) {
      setSaved({ error: err.message })
    }
  }

  const [state, formAction, pending] = useCryptoAction((formData) => {
    setPassphrase('') // don't keep the passphrase in component state after use
    setCopied(false)
    setSaved({})
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

          <label htmlFor="enc-index">Index (optional; leave blank for a random one)</label>
          <input id="enc-index" value={index} onChange={(e) => setIndex(e.target.value)} />
          <button type="button" onClick={handleSave} disabled={!!saved.index}>
            {saved.index ? 'Saved' : 'Save to server'}
          </button>
          {saved.index && <p>Saved with index <code>{saved.index}</code></p>}
          {saved.error && <p className="error" role="alert">{saved.error}</p>}
        </>
      )}
    </form>
  )
}
