import { Counts } from '@/components/Counts'
import { Header } from '@/components/Header'
import type { Deck } from '@/db'
import type { DeckCounts } from '@/srs'

const GRADES = [
  { cls: 'again', label: 'Again', text: "Forgot it. It'll come right back." },
  { cls: 'hard', label: 'Hard', text: 'Got it, but it was a struggle.' },
  { cls: 'good', label: 'Good', text: 'Got it after a moment.' },
  { cls: 'easy', label: 'Easy', text: 'Knew it instantly.' },
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
  return (
    <>
      <Header back={{ href: `/deck/${deck.id}`, label: 'Deck' }} title="Spaced Repetition" />
      <main className="page">
        <section className="card stack-sm">
          <h2>How it works</h2>
          <p>
            Every card gets its own schedule. Cards you know well come back less and less often. Cards you struggle with
            come back sooner.
          </p>
          <p>
            New cards are introduced a few at a time ({deck.newPerDay} a day for this deck, change it with Edit on the deck
            page).
          </p>
          <p>A few minutes every day beats cramming.</p>
        </section>

        <section className="card stack-sm">
          <h2>How to use it</h2>
          <ol className="steps">
            <li>Look at the front and try to recall the answer.</li>
            <li>
              Tap the card or <strong>Show answer</strong> to flip it.
            </li>
            <li>Grade yourself honestly:</li>
          </ol>
          <ul className="grade-guide">
            {GRADES.map((g) => (
              <li key={g.cls}>
                <span className={`tag ${g.cls}`}>{g.label}</span>
                <span>{g.text}</span>
              </li>
            ))}
          </ul>
          <p className="muted small">Each button shows when you'll see the card next. Tapped the wrong one? Hit Undo.</p>
        </section>

        <section className="card stack-sm">
          <h2>Today's session</h2>
          <Counts counts={counts} />
          <p className="muted small center">
            {total > 0
              ? `${total} ${total === 1 ? 'card' : 'cards'} to go through.`
              : moreNew > 0
                ? "Nothing due right now. You can learn some extra new cards if you'd like."
                : 'Nothing due right now. Nice work.'}
          </p>
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
