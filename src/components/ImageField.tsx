import { useRef, useState } from 'react'
import { useImageUrl } from '@/images'

export function ImageField({
  imageId,
  pendingUrl,
  onPick,
  onRemove,
}: {
  imageId?: string
  pendingUrl?: string | null
  onPick: (file: File) => void
  onRemove: () => void
}) {
  const stored = useImageUrl(pendingUrl ? undefined : imageId)
  const url = pendingUrl ?? stored
  const input = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  return (
    <div
      className={`image-field ${drag ? 'is-drag' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDrag(false)
        const f = e.dataTransfer.files[0]
        if (f?.type.startsWith('image/')) onPick(f)
      }}
    >
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onPick(f)
          e.target.value = ''
        }}
      />
      {url ? (
        <div className="image-preview">
          <img src={url} alt="" />
          <div className="row">
            <button type="button" className="btn small" onClick={() => input.current?.click()}>
              Replace
            </button>
            <button type="button" className="btn small danger-text" onClick={onRemove}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn small ghost" onClick={() => input.current?.click()}>
          + Add image
        </button>
      )}
    </div>
  )
}
