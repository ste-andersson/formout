import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { getFormBySlugWithFallback } from '../lib/api'
import type { FormDetail } from '../lib/api'
import { decodeSharedResponsePayload, isPasswordProtectedSharedResponsePayload } from '../lib/sharedResponseLink'
import type { SharedResponsePayload } from '../lib/sharedResponseLink'
import { base64ToUint8Array, decryptAnswersWithPassword } from '../lib/passwordCrypto'
import type { FormAnswers } from '../lib/formAnswers'
import { formatResponseDateTime } from '../lib/responseFormat'
import { FormRenderer } from '../components/FormRenderer'
import { useOfflineMode } from '../components/offlineModeContext'
import { OfflineContentUnavailableModal } from '../components/OfflineContentUnavailableModal'
import { PasswordPromptModal } from '../components/PasswordPromptModal'
import { useTranslation } from '../components/languageContext'
import './SharedResponse.css'

type LoadState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'loaded'; form: FormDetail }

export function SharedResponse() {
  const [payload] = useState(() => decodeSharedResponsePayload(window.location.hash))
  const { t } = useTranslation()

  if (!payload) {
    return (
      <div>
        <h1>{t.sharedResponse.invalidLinkTitle}</h1>
        <p>{t.sharedResponse.invalidLinkMessage}</p>
        <Link to="/">{t.formFiller.backHome}</Link>
      </div>
    )
  }

  return <SharedResponseContent payload={payload} />
}

function SharedResponseContent({ payload }: { payload: SharedResponsePayload }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const { offlineMode, setOfflineMode } = useOfflineMode()
  const unavailableDialogRef = useRef<HTMLDialogElement>(null)
  const passwordDialogRef = useRef<HTMLDialogElement>(null)
  const navigate = useNavigate()
  const { t, language } = useTranslation()

  // null while a password-protected payload hasn't been unlocked yet.
  const [answers, setAnswers] = useState<FormAnswers | null>(payload.protected ? null : payload.answers)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    // Runs unconditionally, in parallel with the password prompt below --
    // formSlug/formTitle are already visible in cleartext in the link/QR
    // even in password mode, so prefetching the template costs nothing and
    // means rendering is instant once the password succeeds.
    getFormBySlugWithFallback(payload.formSlug, offlineMode)
      .then((form) => {
        if (cancelled) return
        setState(form ? { status: 'loaded', form } : { status: 'not-found' })
      })
      .catch(() => {
        if (cancelled) return
        setState({ status: 'not-found' })
      })

    return () => {
      cancelled = true
    }
  }, [payload.formSlug, offlineMode])

  // Not just "not found" -- while offline, this form may simply never have
  // been cached (e.g. never opened in the editor). Explain that and offer a
  // way out, instead of the plain not-found text looking like a dead end.
  useEffect(() => {
    if (state.status === 'not-found' && offlineMode && !unavailableDialogRef.current?.open) {
      unavailableDialogRef.current?.showModal()
    }
  }, [state.status, offlineMode])

  useEffect(() => {
    if (isPasswordProtectedSharedResponsePayload(payload) && !answers && !passwordDialogRef.current?.open) {
      passwordDialogRef.current?.showModal()
    }
  }, [payload, answers])

  async function handlePasswordSubmit(password: string) {
    if (!isPasswordProtectedSharedResponsePayload(payload)) return
    try {
      const decrypted = await decryptAnswersWithPassword(password, {
        salt: base64ToUint8Array(payload.salt),
        encrypted: {
          __enc: 1,
          iv: base64ToUint8Array(payload.iv),
          ciphertext: base64ToUint8Array(payload.ciphertext).buffer,
        },
      })
      setPasswordError(null)
      setAnswers(decrypted)
      passwordDialogRef.current?.close()
    } catch {
      // Wrong password -- AES-GCM's auth tag check fails and decrypt() throws.
      setPasswordError(t.sharedResponse.wrongPassword)
    }
  }

  if (isPasswordProtectedSharedResponsePayload(payload) && !answers) {
    return (
      <div>
        <p>{t.sharedResponse.protectedNotice}</p>
        <PasswordPromptModal
          dialogRef={passwordDialogRef}
          variant="enter"
          error={passwordError}
          onSubmit={handlePasswordSubmit}
          // Nothing meaningful to show behind a cancelled password prompt --
          // unlike ResponseActions.tsx's 'set' variant, where cancelling just
          // aborts a share action the user was already looking at a page for.
          onCancel={() => navigate('/')}
        />
      </div>
    )
  }

  if (state.status === 'loading') {
    return <p>{t.sharedResponse.loading}</p>
  }

  if (state.status === 'not-found') {
    return (
      <div>
        <h1>{t.sharedResponse.notFoundTitle}</h1>
        <p>{t.sharedResponse.notFoundMessage}</p>
        <Link to="/">{t.formFiller.backHome}</Link>
        <OfflineContentUnavailableModal
          dialogRef={unavailableDialogRef}
          onDisableOfflineMode={() => setOfflineMode(false)}
        />
      </div>
    )
  }

  return (
    <div className="shared-response">
      <p className="shared-response__meta">{t.sharedResponse.filledIn(formatResponseDateTime(payload.filledInAt, language))}</p>
      <FormRenderer schema={state.form.schema} answers={answers ?? {}} readOnly />
    </div>
  )
}
