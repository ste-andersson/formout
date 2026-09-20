import { useCallback, useRef } from 'react'
import { PasswordPromptModal } from './PasswordPromptModal'

// Promise-based "set a password" prompt for one-shot share/export actions
// (ResponseActions.tsx, RespondentHome.tsx). Deliberately stateless across
// calls -- nothing is cached in memory or storage, every call shows a fresh
// empty modal, matching the app's established "re-approve every time"
// convention (see offlineMode.ts's authExceptionsAllowed).
export function usePasswordPrompt() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const resolverRef = useRef<((value: string | null) => void) | null>(null)

  const promptForPassword = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      dialogRef.current?.showModal()
    })
  }, [])

  function resolveOnce(value: string | null) {
    resolverRef.current?.(value)
    resolverRef.current = null
  }

  const modal = (
    <PasswordPromptModal
      dialogRef={dialogRef}
      variant="set"
      onSubmit={(password) => resolveOnce(password)}
      onCancel={() => resolveOnce(null)}
    />
  )

  return { promptForPassword, modal }
}
