import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { backupFileName, createBackup, saveFile } from '@/backup'
import { Counts } from '@/components/Counts'
import { Header } from '@/components/Header'
import { toDelimited } from '@/csv'
import { db, deleteDeck, newCardsLeft, newCardsStudiedToday, type Card } from '@/db'
import { useNow } from '@/hooks'
import { useImageUrl } from '@/images'
import { navigate } from '@/router'
import { deckCounts, formatInterval, isLearning, isNew } from '@/srs'
import { toast } from '@/toast'

function status(c: Card, now: number): { label: string; cls: string } {
  if (isNew(c)) return { label: 'New', cls: 'new' }
  if (c.srs.due <= now) return { label: 'Due', cls: 'due' }
  return { label: `${isLearning(c) ? 'Learning, due' : 'Due'} in ${formatInterval(c.srs.due - now)}`, cls: '' }
}

function Thumb({ id }: { id?: string }) {
  const url = useImageUrl(id)
  return url ? <img className="thumb" src={url} alt="" /> : null
}

export function NotFound() {
  return (
    <main className="page empty">
      <h2>Not found</h2>
      <p className="muted">That deck or card doesn't exist anymore.</p>
      <a className="btn primary" href="#/">
        Go to decks
      </a>
    </main>
  )
}

export function DeckPage({ deckId }: { deckId: string }) {
  const now = useNow()
  const deck = useLiveQuery(async () => (await db.decks.get(deckId)) ?? null, [deckId])
  const cards = useLiveQuery(() => db.cards.where('deckId').equals(deckId).sortBy('createdAt'), [deckId])
  const newToday = useLiveQuery(() => newCardsStudiedToday(deckId, now), [deckId, now])
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = [...(cards ?? [])].reverse()
    return needle ? list.filter((c) => [c.front, c.back, c.notes ?? ''].join('\n').toLowerCase().includes(needle)) : list
  }, [cards, q])

  if (deck === null) return <NotFound />
  if (!deck || !cards) return null

  const counts = deckCounts(cards, newCardsLeft(deck, newToday ?? 0), now)
  const dueNow = counts.review + counts.learning + counts.newCount

  async function exportDeck(includeProgress: boolean) {
    const data = await createBackup({ deckIds: [deckId], includeProgress })
    await saveFile(backupFileName(deck!.name), JSON.stringify(data))
  }

  async function exportCsv() {
    const body = toDelimited(cards!.map((c) => ({ front: c.front, back: c.back })))
    await saveFile(backupFileName(deck!.name).replace(/\.json$/, '.csv'), body, 'text/csv')
  }

  async function remove() {
    if (!confirm(`Delete "${deck!.name}" and all ${cards!.length} cards? This can't be undone.`)) return
    await deleteDeck(deckId)
    toast('Deck deleted')
    navigate('/', true)
  }

  return (
    <>
      <Header back={{ href: '/', label: 'Decks' }} title={deck.name} actions={<a className="btn small ghost" href={`#/deck/${deckId}/edit`}>Edit</a>} />
      <main className="page">
        {deck.description && <p className="muted">{deck.description}</p>}

        <section className="card study-box">
          <Counts counts={counts} />
          {cards.length === 0 ? (
            <a className="btn primary big block" href={`#/deck/${deckId}/add`}>
              Add your first card
            </a>
          ) : (
            <>
              <a className="btn primary big block mode" href={`#/deck/${deckId}/study`}>
                <span>Spaced Repetition</span>
                <small>{dueNow > 0 ? `${dueNow} ${dueNow === 1 ? 'card' : 'cards'} ready for review` : 'All caught up for now'}</small>
              </a>
              <a className="btn big block mode" href={`#/deck/${deckId}/drill`}>
                <span>Free Drill</span>
                <small>Randomized practice</small>
              </a>
            </>
          )}
        </section>

        <div className="row space section-head">
          <h2>
            Cards <span className="muted">({cards.length})</span>
          </h2>
          <a className="btn small primary" href={`#/deck/${deckId}/add`}>
            + Add
          </a>
        </div>
        {cards.length > 5 && (
          <input className="search" type="search" placeholder="Search cards" value={q} onChange={(e) => setQ(e.target.value)} />
        )}
        <ul className="card-list">
          {filtered.map((c) => {
            const s = status(c, now)
            return (
              <li key={c.id}>
                <a href={`#/card/${c.id}`} className="card-row">
                  <Thumb id={c.frontImage ?? c.backImage} />
                  <div className="card-row-text">
                    <span className="clamp">{c.front || (c.frontImage ? '(image only)' : '(blank)')}</span>
                    <span className="muted small clamp">{c.back || (c.backImage ? '(image only)' : '')}</span>
                  </div>
                  <span className={`pill ${s.cls}`}>{s.label}</span>
                </a>
              </li>
            )
          })}
          {q && filtered.length === 0 && <li className="muted center pad">No matches.</li>}
        </ul>

        <section className="options">
          <h2>Deck options</h2>
          <a className="btn block" href={`#/deck/${deckId}/import`}>
            Import cards from text or spreadsheet
          </a>
          <button className="btn block" onClick={() => exportDeck(false)}>
            Share deck (without my progress)
          </button>
          <button className="btn block" onClick={() => exportDeck(true)}>
            Export deck with progress
          </button>
          <button className="btn block" onClick={exportCsv}>
            Export as CSV (text only)
          </button>
          <button className="btn block danger-text" onClick={remove}>
            Delete deck
          </button>
        </section>
      </main>
    </>
  )
}
