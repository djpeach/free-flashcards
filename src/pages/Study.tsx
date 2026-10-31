import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CardFace, FlipCard, WithNotes } from '@/components/CardFace'
import { Header } from '@/components/Header'
import { SrsIntro } from '@/components/SrsIntro'
import { db, newCardsLeft, newCardsStudiedToday, type Card } from '@/db'
import { useKeys } from '@/keys'
import { NotFound } from '@/pages/Deck'
import {
  afterAnswer,
  answer,
  buildSession,
  deckCounts,
  isNew,
  LEARN_AHEAD_MS,
  pickNext,
  Rating,
  type Grade,
  type Session,
} from '@/srs'

const BUTTONS: { grade: Grade; label: string; cls: string }[] = [
  { grade: Rating.Again, label: 'Wrong', cls: 'again' },
  { grade: Rating.Hard, label: 'Hard', cls: 'hard' },
  { grade: Rating.Good, label: 'Ok', cls: 'good' },
  { grade: Rating.Easy, label: 'Easy', cls: 'easy' },
]

interface UndoState {
  card: Card
  reviewId: number
  session: Session
}

export function Study({ deckId }: { deckId: string }) {
  const deck = useLiveQuery(async () => (await db.decks.get(deckId)) ?? null, [deckId])
  const cards = useLiveQuery(() => db.cards.where('deckId').equals(deckId).toArray(), [deckId])
  const newToday = useLiveQuery(() => newCardsStudiedToday(deckId), [deckId])
  const byId = useMemo(() => new Map((cards ?? []).map((c) => [c.id, c])), [cards])

  const [session, setSession] = useState<Session | null>(null)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [waitUntil, setWaitUntil] = useState<number | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [undo, setUndo] = useState<UndoState | null>(null)
  const [reviewed, setReviewed] = useState(0)
  const [busy, setBusy] = useState(false)

  const advance = useCallback((s: Session, lastId: string | null) => {
    const p = pickNext(s, lastId)
    setFlipped(false)
    if (p.id !== null) {
      setCurrentId(p.id)
      setWaitUntil(null)
    } else {
      setCurrentId(null)
      setWaitUntil(p.waitUntil)
    }
  }, [])

  function start(extraNew: number) {
    if (!deck || !cards || newToday === undefined) return
    const s = buildSession(cards, newCardsLeft(deck, newToday) + extraNew)
    setSession(s)
    advance(s, null)
  }

  useEffect(() => {
    if (!waitUntil || !session) return
    const t = setTimeout(() => advance(session, null), Math.max(1000, waitUntil - LEARN_AHEAD_MS - Date.now()))
    return () => clearTimeout(t)
  }, [waitUntil, session, advance])

  const current = currentId ? byId.get(currentId) : undefined

  async function rate(grade: Grade) {
    if (!current || !session || busy) return
    setBusy(true)
    try {
      const now = Date.now()
      const srs = answer(current.srs, grade, now)
      let reviewId = 0
      await db.transaction('rw', db.cards, db.reviews, async () => {
        await db.cards.update(current.id, { srs })
        reviewId = (await db.reviews.add({
          cardId: current.id,
          deckId,
          rating: grade,
          wasNew: isNew(current),
          at: now,
        })) as number
      })
      const next = afterAnswer(session, current.id, srs, now)
      setUndo({ card: current, reviewId, session })
      setSession(next)
      setReviewed((n) => n + 1)
      advance(next, current.id)
    } finally {
      setBusy(false)
    }
  }

  async function undoLast() {
    if (!undo || busy) return
    setBusy(true)
    try {
      await db.transaction('rw', db.cards, db.reviews, async () => {
        await db.cards.put(undo.card)
        await db.reviews.delete(undo.reviewId)
      })
      setSession(undo.session)
      setCurrentId(undo.card.id)
      setWaitUntil(null)
      setFlipped(false)
      setReviewed((n) => n - 1)
      setUndo(null)
    } finally {
      setBusy(false)
    }
  }

  useKeys((key) => {
    if (key === 'z' || key === 'u') return void undoLast()
    if (!current) return
    if (!flipped && (key === ' ' || key === 'Enter')) return setFlipped(true)
    if (flipped && (key === ' ' || key === 'Enter')) return void rate(Rating.Good)
    if (flipped && ['1', '2', '3', '4'].includes(key)) return void rate(BUTTONS[Number(key) - 1].grade)
  })

  if (deck === null) return <NotFound />
  if (!deck || !cards || newToday === undefined) return null
  if (!session) {
    const counts = deckCounts(cards, newCardsLeft(deck, newToday))
    const moreNew = cards.filter(isNew).length - counts.newCount
    return <SrsIntro deck={deck} counts={counts} moreNew={moreNew} onStart={start} />
  }

  const remaining = session.pending.map((id) => byId.get(id)).filter((c): c is Card => !!c)
  const newLeft = remaining.filter(isNew).length
  const reviewLeft = remaining.length - newLeft
  const back = { href: `/deck/${deckId}`, label: current ? 'Stop' : 'Deck' }
  const undoBtn = undo && (
    <button className="btn small ghost" onClick={undoLast} disabled={busy}>
      Undo
    </button>
  )

  if (!current) {
    const waitMin = waitUntil ? Math.max(1, Math.ceil((waitUntil - LEARN_AHEAD_MS - Date.now()) / 60000)) : null
    return (
      <>
        <Header back={back} title={deck.name} actions={undoBtn} />
        <main className="page empty">
          <div className="empty-art" aria-hidden="true">
            {waitMin ? '⏳' : '🎉'}
          </div>
          <h2>{waitMin ? 'Nice, take a short break' : reviewed ? 'Done for now!' : 'Nothing due right now'}</h2>
          <p className="muted">
            {waitMin
              ? `A few learning cards come back in about ${waitMin} min. Keep this open or check back later.`
              : reviewed
                ? `You reviewed ${reviewed} ${reviewed === 1 ? 'card' : 'cards'}.`
                : 'Come back later, or use Free Drill to go through everything.'}
          </p>
          <div className="stack">
            <a className="btn primary" href={`#/deck/${deckId}`}>
              Back to deck
            </a>
            <a className="btn" href={`#/deck/${deckId}/drill`}>
              Free Drill
            </a>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Header
        back={back}
        title={
          <span className="study-counts">
            <span className="c-new">{newLeft}</span>
            <span className="c-learn">{session.learning.length}</span>
            <span className="c-due">{reviewLeft}</span>
          </span>
        }
        actions={undoBtn}
      />
      <main className="page study">
        <WithNotes key={current.id} notes={current.notes}>
          <FlipCard
            flipped={flipped}
            onFlip={() => setFlipped((f) => !f)}
            front={<CardFace text={current.front} imageId={current.frontImage} />}
            back={
              <>
                {current.front && <div className="face-context clamp">{current.front}</div>}
                <CardFace text={current.back} imageId={current.backImage} />
              </>
            }
          />
        </WithNotes>
        <div className="answer-bar">
          <button className={`btn primary big block ${flipped ? 'is-hidden' : ''}`} onClick={() => setFlipped(true)}>
            Show answer
          </button>
          <div className={flipped ? '' : 'is-hidden'}>
            <p className="grades-caption">How hard was that?</p>
            <div className="grades">
              {BUTTONS.map((b) => (
                <button key={b.grade} className={`grade ${b.cls}`} onClick={() => rate(b.grade)} disabled={busy}>
                  <span className="grade-label">{b.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
