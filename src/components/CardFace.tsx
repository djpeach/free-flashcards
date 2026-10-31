import { useImageUrl } from '@/images'

function sizeClass(text: string): string {
  const n = text.length
  if (n <= 24) return 'text-xl'
  if (n <= 80) return 'text-lg'
  if (n <= 240) return 'text-md'
  return 'text-sm'
}

export function CardFace({ text, imageId, label }: { text: string; imageId?: string; label?: string }) {
  const url = useImageUrl(imageId)
  return (
    <div className="face-content">
      {label && <div className="face-label">{label}</div>}
      {url && <img className="face-image" src={url} alt="" />}
      {text && <div className={`face-text ${sizeClass(text)}`}>{text}</div>}
      {!text && !url && <div className="face-text muted">(blank)</div>}
    </div>
  )
}

export function FlipCard({
  flipped,
  onFlip,
  front,
  back,
}: {
  flipped: boolean
  onFlip: () => void
  front: React.ReactNode
  back: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={`flip ${flipped ? 'is-flipped' : ''}`}
      onClick={onFlip}
      aria-label={flipped ? 'Show front' : 'Show back'}
    >
      <div className="flip-inner">
        <div className="flip-face flip-front" aria-hidden={flipped}>
          {front}
        </div>
        <div className="flip-face flip-back" aria-hidden={!flipped}>
          {back}
        </div>
      </div>
    </button>
  )
}
