import { useState } from 'react'
import { decryptMessage } from '../crypto.js'
import { useCryptoAction } from '../useCryptoAction.js'

export default function DecryptPage() {
  const [encrypted, setEncrypted] = useState('')
  const [passphrase, setPassphrase] = useState('')

  const [state, formAction, pending] = useCryptoAction((formData) => {
    setPassphrase('') // don't keep the passphrase in component state after use
    return decryptMessage(formData.get('encrypted'), formData.get('passphrase'))
  })

  return (
    <form action={formAction}>
      <h2>Decrypt a message</h2>

      <label htmlFor="dec-encrypted">Encrypted message (Base64)</label>
      <textarea
        id="dec-encrypted"
        name="encrypted"
        rows={6}
        className="mono"
        value={encrypted}
        onChange={(e) => setEncrypted(e.target.value)}
        required
      />

      <label htmlFor="dec-passphrase">Passphrase</label>
      <input
        id="dec-passphrase"
        name="passphrase"
        type="password"
        autoComplete="current-password"
        value={passphrase}
        onChange={(e) => setPassphrase(e.target.value)}
        required
      />

      <button type="submit" disabled={pending || !passphrase || !encrypted.trim()}>
        {pending ? 'Decrypting…' : 'Decrypt'}
      </button>

      {state.error && <p className="error" role="alert">{state.error}</p>}

      {'output' in state && (
        <>
          <label htmlFor="dec-result">Plaintext</label>
          <textarea id="dec-result" rows={6} value={state.output} readOnly />
        </>
      )}
    </form>
  )
}
