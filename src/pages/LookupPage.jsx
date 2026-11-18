import { useState } from 'react'
import { lookupMessage } from '../api.js'
import { decryptMessage } from '../crypto.js'
import { useCryptoAction } from '../useCryptoAction.js'

export default function LookupPage() {
  const [index, setIndex] = useState('')
  const [ciphertext, setCiphertext] = useState('')
  const [lookupError, setLookupError] = useState('')
  const [passphrase, setPassphrase] = useState('')

  async function handleLookup(e) {
    e.preventDefault()
    setCiphertext('')
    setLookupError('')
    try {
      const msg = await lookupMessage(index.trim())
      setCiphertext(msg.ciphertext)
    } catch (err) {
      setLookupError(err.message)
    }
  }

  // Decryption happens here in the browser; the passphrase is never sent.
  const [state, decryptAction, pending] = useCryptoAction((formData) => {
    setPassphrase('')
    return decryptMessage(ciphertext, formData.get('passphrase'))
  })

  return (
    <>
      <form onSubmit={handleLookup}>
        <h2>Look up a message</h2>
        <label htmlFor="lookup-index">Index</label>
        <input
          id="lookup-index"
          value={index}
          onChange={(e) => setIndex(e.target.value)}
          required
        />
        <button type="submit" disabled={!index.trim()}>Look up</button>
        {lookupError && <p className="error" role="alert">{lookupError}</p>}
      </form>

      {ciphertext && (
        <form action={decryptAction}>
          <label htmlFor="lookup-ciphertext">Encrypted message (Base64)</label>
          <textarea id="lookup-ciphertext" rows={6} className="mono" value={ciphertext} readOnly />

          <label htmlFor="lookup-passphrase">Passphrase</label>
          <input
            id="lookup-passphrase"
            name="passphrase"
            type="password"
            autoComplete="current-password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            required
          />
          <button type="submit" disabled={pending || !passphrase}>
            {pending ? 'Decrypting…' : 'Decrypt'}
          </button>

          {state.error && <p className="error" role="alert">{state.error}</p>}
          {'output' in state && (
            <>
              <label htmlFor="lookup-result">Plaintext</label>
              <textarea id="lookup-result" rows={6} value={state.output} readOnly />
            </>
          )}
        </form>
      )}
    </>
  )
}
