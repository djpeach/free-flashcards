import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CardFace, FlipCard, WithNotes } from '@/components/CardFace'
import { Header } from '@/components/Header'
import { db, type Card } from '@/db'
import { useKeys } from '@/keys'
import { NotFound } from '@/pages/Deck'
import { shuffle } from '@/srs'

type Side = 'front' | 'back' | 'mixed'

interface Run {
  queue: { id: string; reversed: boolean }[]
  missed: Set<string>
  total: number
  seen: number
}

function startRun(ids: string[], side: Side): Run {
  return {
    queue: shuffle(ids).map((id) => ({
      id,
      reversed: side === 'back' || (side === 'mixed' && Math.random() < 0.5),
    })),
    missed: new Set(),
    total: ids.length,
    seen: 0,
  }
}

export function Drill({ deckId }: { deckId: string }) {
  const deck = useLiveQuery(async () => (await db.decks.get(deckId)) ?? null, [deckId])
  const cards = useLiveQuery(() => db.cards.where('deckId').equals(deckId).toArray(), [deckId])
  const byId = useMemo(() => new Map((cards ?? []).map((c) => [c.id, c])), [cards])
  const [side, setSide] = useState<Side>(() => (localStorage.getItem('drillSide') as Side) || 'front')
  const [run, setRun] = useState<Run | null>(null)
  const [flipped, setFlipped] = useState(false)

  const head = run?.queue[0]
  const card: Card | undefined = head ? byId.get(head.id) : undefined

  function begin(ids: string[]) {
    localStorage.setItem('drillSide', side)
    setRun(startRun(ids, side))
    setFlipped(false)
  }

  function mark(gotIt: boolean) {
    if (!run || !head) return
    const rest = run.queue.slice(1)
    const missed = new Set(run.missed)
    if (!gotIt) {
      missed.add(head.id)
      const at = Math.min(rest.length, 3 + Math.floor(Math.random() * 3))
      rest.splice(at, 0, head)
    }
    setRun({ ...run, queue: rest, missed, seen: run.seen + (gotIt ? 1 : 0) })
    setFlipped(false)
  }

  useKeys((key) => {
    if (!card) return
    if (key === ' ' || key === 'Enter') return flipped ? mark(true) : setFlipped(true)
    if (flipped && (key === '1' || key === 'ArrowLeft')) return mark(false)
    if (flipped && (key === '2' || key === 'ArrowRight')) return mark(true)
  })

  if (deck === null) return <NotFound />
  if (!deck || !cards) return null
  const back = { href: `/deck/${deckId}`, label: 'Deck' }

  if (!run) {
    return (
      <>
        <Header back={back} title="Free Drill" />
        <main className="page stack">
          <p className="muted">
            Go through every card in <strong>{deck.name}</strong> in random order. Missed cards come back until you get them. This
            doesn't change your study schedule.
          </p>
          <div className="field">
            <span>Show first</span>
            <div className="segmented">
              {(['front', 'back', 'mixed'] as Side[]).map((s) => (
                <button key={s} className={side === s ? 'on' : ''} onClick={() => setSide(s)}>
                  {s === 'front' ? 'Front' : s === 'back' ? 'Back' : 'Mixed'}
                </button>
              ))}
            </div>
          </div>
          <button className="btn primary big" disabled={!cards.length} onClick={() => begin(cards.map((c) => c.id))}>
            Start ({cards.length} cards)
          </button>
        </main>
      </>
    )
  }

  if (!card) {
    const missed = [...run.missed].filter((id) => byId.has(id))
    const firstTry = run.total - run.missed.size
    return (
      <>
        <Header back={back} title="Free Drill" />
        <main className="page empty">
          <div className="empty-art" aria-hidden="true">
            {missed.length ? '💪' : '🏆'}
          </div>
          <h2>
            {firstTry} / {run.total} on the first try
          </h2>
          <div className="stack">
            {missed.length > 0 && (
              <button className="btn primary" onClick={() => begin(missed)}>
                Drill the {missed.length} I missed
              </button>
            )}
            <button className={`btn ${missed.length ? '' : 'primary'}`} onClick={() => begin(cards.map((c) => c.id))}>
              Drill all again
            </button>
            <a className="btn ghost" href={`#/deck/${deckId}`}>
              Back to deck
            </a>
          </div>
        </main>
      </>
    )
  }

  const q = head!.reversed ? { text: card.back, img: card.backImage } : { text: card.front, img: card.frontImage }
  const a = head!.reversed ? { text: card.front, img: card.frontImage } : { text: card.back, img: card.backImage }

  return (
    <>
      <Header
        back={back}
        title={
          <span className="muted small">
            {run.seen} / {run.total}
          </span>
        }
      />
      <main className="page study">
        <div className="progress" aria-hidden="true">
          <div style={{ width: `${(run.seen / run.total) * 100}%` }} />
        </div>
        <WithNotes key={`${card.id}-${run.seen}-${run.queue.length}`} notes={card.notes}>
          <FlipCard
            flipped={flipped}
            onFlip={() => setFlipped((f) => !f)}
            front={<CardFace text={q.text} imageId={q.img} />}
            back={<CardFace text={a.text} imageId={a.img} />}
          />
        </WithNotes>
        <div className="answer-bar">
          <button className={`btn primary big block ${flipped ? 'is-hidden' : ''}`} onClick={() => setFlipped(true)}>
            Flip
          </button>
          <div className={`grades two ${flipped ? '' : 'is-hidden'}`}>
            <button className="grade again" onClick={() => mark(false)}>
              <span className="grade-label">Missed it</span>
            </button>
            <button className="grade good" onClick={() => mark(true)}>
              <span className="grade-label">Got it</span>
            </button>
          </div>
        </div>
      </main>
    </>
  )
}
