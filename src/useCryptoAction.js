import { useActionState } from 'react'
import { CryptoError } from './crypto.js'

/**
 * Wraps an async crypto operation as a form action.
 *
 * - Expected failures (CryptoError: wrong passphrase, bad input) become
 *   `state.error` so the page can show them inline without losing the form.
 * - Anything else is a bug: it is re-thrown, and React sends it to the
 *   nearest <ErrorBoundary>.
 *
 * Returns [state, formAction, isPending], where state is { output } or { error }.
 */
export function useCryptoAction(run) {
  return useActionState(async (_prevState, formData) => {
    try {
      return { output: await run(formData) }
    } catch (err) {
      if (err instanceof CryptoError) return { error: err.message }
      throw err
    }
  }, {})
}
