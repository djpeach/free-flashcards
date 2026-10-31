import { CardEditor } from '@/pages/CardEditor'

export function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="icon-btn accent" onClick={onClick} aria-label="Edit card" title="Edit card (E)">
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z M13.5 6.5l4 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

export function EditOverlay({ cardId, onClose }: { cardId: string; onClose: () => void }) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Edit card">
      <CardEditor cardId={cardId} onClose={onClose} />
    </div>
  )
}
