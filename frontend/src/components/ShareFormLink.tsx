import { useRef } from 'react'
import QRCode from 'react-qr-code'
import { useToast } from './toastContext'
import { useTranslation } from './languageContext'
import { ExportDialog } from './ExportDialog'
import './ShareFormLink.css'

interface ShareFormLinkProps {
  slug: string
  title: string
  disabled?: boolean
  triggerClassName?: string
}

export function ShareFormLink({ slug, title, disabled, triggerClassName }: ShareFormLinkProps) {
  const shareDialogRef = useRef<HTMLDialogElement>(null)
  const qrDialogRef = useRef<HTMLDialogElement>(null)
  const { showToast } = useToast()
  const { t } = useTranslation()
  const link = `${window.location.origin}/forms/${slug}`

  function handleMailLink() {
    const subject = encodeURIComponent(title)
    const body = encodeURIComponent(t.shareFormLink.mailBody(link))
    window.location.href = `mailto:?subject=${subject}&body=${body}`
    shareDialogRef.current?.close()
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(link)
      showToast(t.shareFormLink.linkCopiedToast, 'success')
    } catch {
      showToast(t.shareFormLink.linkCopyFailedToast, 'error')
    }
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(slug)
      showToast(t.shareFormLink.codeCopiedToast, 'success')
    } catch {
      showToast(t.shareFormLink.codeCopyFailedToast, 'error')
    }
  }

  const triggerClasses = [triggerClassName ?? 'btn btn--neutral', disabled ? 'export-dialog__option--muted' : undefined]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <button
        type="button"
        className={triggerClasses || undefined}
        title={disabled ? t.shareFormLink.publishFirstHint : undefined}
        onClick={() => {
          if (disabled) {
            showToast(t.shareFormLink.publishFirstToast, 'error')
            return
          }
          shareDialogRef.current?.showModal()
        }}
      >
        {t.shareFormLink.shareButton}
      </button>

      <ExportDialog dialogRef={shareDialogRef} title={t.shareFormLink.shareFormTitle}>
        <button type="button" className="btn btn--neutral" onClick={handleCopyCode}>
          {t.shareFormLink.copyCode(slug)}
        </button>
        <button type="button" className="btn btn--neutral" onClick={handleMailLink}>
          {t.shareFormLink.mailLink}
        </button>
        <button
          type="button"
          className="btn btn--neutral"
          onClick={() => {
            shareDialogRef.current?.close()
            // Open the next dialog on a new frame -- doing it in the same
            // tick as close() leaves the browser in an inconsistent state on
            // some mobile browsers, where the new dialog's first tap is
            // swallowed.
            requestAnimationFrame(() => qrDialogRef.current?.showModal())
          }}
        >
          {t.shareFormLink.showQr}
        </button>
      </ExportDialog>

      <ExportDialog dialogRef={qrDialogRef} title={t.shareFormLink.qrTitle}>
        <div className="share-form-link__qr">
          <div className="share-form-link__qr-frame">
            <QRCode value={link} size={200} />
          </div>
          <div className="share-form-link__link-copy">
            <input
              type="text"
              readOnly
              value={link}
              onFocus={(e) => e.target.select()}
              className="share-form-link__link-input"
            />
            <button type="button" className="btn btn--neutral btn--small" onClick={handleCopyLink}>
              {t.shareFormLink.copyLink}
            </button>
          </div>
        </div>
      </ExportDialog>
    </>
  )
}
