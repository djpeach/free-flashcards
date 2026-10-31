import type { DeckCounts } from '@/srs'

export function Counts({ counts }: { counts: DeckCounts }) {
  return (
    <div className="counts">
      <div>
        <strong className="c-new">{counts.newCount}</strong>
        <span>New</span>
      </div>
      <div>
        <strong className="c-learn">{counts.learning}</strong>
        <span>Learning</span>
      </div>
      <div>
        <strong className="c-due">{counts.review}</strong>
        <span>Review</span>
      </div>
    </div>
  )
}
