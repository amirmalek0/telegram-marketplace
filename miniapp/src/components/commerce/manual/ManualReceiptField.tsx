import { useEffect, useRef, useState } from 'react'
import { useContent } from '../../../features/content/ContentProvider'
import { Icon } from '../../ui/Icon'

export function ManualReceiptField({ file, sampleReceipt, disabled, onChange, onError }: {
  file: File | null; sampleReceipt: boolean; disabled: boolean
  onChange: (file: File | null) => void; onError: (error: string) => void
}) {
  const { text } = useContent()
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState('')
  useEffect(() => {
    if (!file) { setPreview(''); return }
    const url = URL.createObjectURL(file); setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  const hasReceipt = Boolean(file || sampleReceipt)
  return <div className="manual-receipt-field">
    <label className={`manual-upload ${hasReceipt ? 'has-receipt' : ''}`}>
      <span className="manual-upload-icon">{preview ? <img src={preview} alt="" /> : <Icon name={hasReceipt ? 'check' : 'plus'} size={23} />}</span>
      <span className="manual-upload-copy"><strong>{hasReceipt ? text('manual.receipt_ready') : text('manual.upload')}</strong><small>{file ? <span data-content-static>{file.name}</span> : sampleReceipt ? <span data-content-static>receipt-preview.png</span> : text('manual.upload_hint')}</small></span>
      <input ref={input} disabled={disabled} aria-label={text('manual.receipt_label')} type="file" accept="image/png,image/jpeg" onChange={event => {
        const next = event.target.files?.[0] || null
        if (!next) return
        if (next.size > 5 * 1024 * 1024 || !['image/png', 'image/jpeg'].includes(next.type)) { onError(text('manual.invalid_file')); event.target.value = ''; return }
        onChange(next); onError('')
      }} />
    </label>
    {hasReceipt && <button type="button" className="manual-text-action" disabled={disabled} onClick={() => { onChange(null); if (input.current) input.current.value = '' }}>{text('manual.remove_receipt')}</button>}
  </div>
}
