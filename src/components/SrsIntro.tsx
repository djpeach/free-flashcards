import { Counts } from '@/components/Counts'
import { Header } from '@/components/Header'
import { useMemo } from 'react'
import type { Deck } from '@/db'
import { formatInterval, newSrs, preview, Rating, type DeckCounts, type Grade } from '@/srs'

const GRADES: { grade: Grade; cls: string; label: string; text: string }[] = [
  { grade: Rating.Again, cls: 'again', label: 'Wrong', text: "Didn't know it" },
  { grade: Rating.Hard, cls: 'hard', label: 'Hard', text: 'Barely got it' },
  { grade: Rating.Good, cls: 'good', label: 'Ok', text: 'Got it' },
  { grade: Rating.Easy, cls: 'easy', label: 'Easy', text: 'Knew it instantly' },
]

export function SrsIntro({
  deck,
  counts,
  moreNew,
  onStart,
}: {
  deck: Deck
  counts: DeckCounts
  moreNew: number
  onStart: (extraNew: number) => void
}) {
  const total = counts.newCount + counts.learning + counts.review
  const firstWait = useMemo(() => preview(newSrs()), [])
  return (
    <>
      <Header back={{ href: `/deck/${deck.id}`, label: 'Deck' }} title="Spaced Repetition" />
      <main className="page">
        <section className="card stack-sm">
          <h2>How it works</h2>
          <p>Flip each card, then rate how hard it was. That decides when you see it again.</p>
          <ul className="grade-guide">
            {GRADES.map((g) => (
              <li key={g.cls}>
                <span className={`tag ${g.cls}`}>{g.label}</span>
                <span>{g.text}</span>
                <span className="when">{formatInterval(firstWait[g.grade])}</span>
              </li>
            ))}
          </ul>
          <p className="muted small">
            Those times are for a new card. Every time you remember it, the wait gets longer: days, then weeks, then
            months.
          </p>
        </section>

        <section className="card stack-sm">
          <h2>Today</h2>
          <Counts counts={counts} />
          {total === 0 && <p className="muted small center">Nothing due right now.</p>}
        </section>

        <div className="cta-bar">
          {total > 0 ? (
            <button className="btn primary big block" onClick={() => onStart(0)}>
              Get Started
            </button>
          ) : (
            <>
              {moreNew > 0 && (
                <button className="btn primary big block" onClick={() => onStart(Math.min(10, moreNew))}>
                  Learn {Math.min(10, moreNew)} more new {moreNew === 1 ? 'card' : 'cards'}
                </button>
              )}
              <a className={`btn big block ${moreNew > 0 ? '' : 'primary'}`} href={`#/deck/${deck.id}/drill`}>
                Free Drill instead
              </a>
            </>
          )}
        </div>
      </main>
    </>
  )
}
