import { useRef } from 'react'
import QRCode from 'react-qr-code'
import { useToast } from './toastContext'
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
  const link = `${window.location.origin}/forms/${slug}`

  function handleMailLink() {
    const subject = encodeURIComponent(title)
    const body = encodeURIComponent(`Fyll i formuläret via länken nedan:\n\n${link}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
    shareDialogRef.current?.close()
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(link)
      showToast('Länk kopierad', 'success')
    } catch {
      showToast('Kunde inte kopiera länken', 'error')
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
        title={disabled ? 'Publicera formuläret innan du kan dela det.' : undefined}
        onClick={() => {
          if (disabled) {
            showToast('Publicera formuläret innan du kan dela det.', 'error')
            return
          }
          shareDialogRef.current?.showModal()
        }}
      >
        Dela
      </button>

      <ExportDialog dialogRef={shareDialogRef} title="Dela formulär">
        <button type="button" className="btn btn--neutral" onClick={handleMailLink}>
          Maila länk
        </button>
        <button
          type="button"
          className="btn btn--neutral"
          onClick={() => {
            shareDialogRef.current?.close()
            qrDialogRef.current?.showModal()
          }}
        >
          Visa QR-kod/länk
        </button>
      </ExportDialog>

      <ExportDialog dialogRef={qrDialogRef} title="QR-kod">
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
              Kopiera länk
            </button>
          </div>
        </div>
      </ExportDialog>
    </>
  )
}
