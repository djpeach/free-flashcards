import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Header } from '@/components/Header'
import { detectDelimiter, parseDelimited, rowsToPairs, type Delimiter } from '@/csv'
import { db, newId } from '@/db'
import { requestPersistence } from '@/install'
import { NotFound } from '@/pages/Deck'
import { navigate } from '@/router'
import { newSrs } from '@/srs'
import { toast } from '@/toast'

const DELIMS: { value: Delimiter | 'auto'; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: '\t', label: 'Tab' },
  { value: ',', label: 'Comma' },
  { value: ';', label: 'Semicolon' },
]

export function ImportText({ deckId }: { deckId: string }) {
  const deck = useLiveQuery(async () => (await db.decks.get(deckId)) ?? null, [deckId])
  const [text, setText] = useState('')
  const [delim, setDelim] = useState<Delimiter | 'auto'>('auto')
  const [header, setHeader] = useState(false)
  const [swap, setSwap] = useState(false)

  const pairs = useMemo(() => {
    if (!text.trim()) return []
    const rows = parseDelimited(text, delim === 'auto' ? detectDelimiter(text) : delim)
    const p = rowsToPairs(header ? rows.slice(1) : rows)
    return swap ? p.map(({ front, back }) => ({ front: back, back: front })) : p
  }, [text, delim, header, swap])

  async function onFile(f: File) {
    setText(await f.text())
  }

  async function doImport() {
    const now = Date.now()
    await db.cards.bulkAdd(
      pairs.map((p, i) => ({ id: newId(), deckId, ...p, srs: newSrs(now), createdAt: now + i, updatedAt: now + i })),
    )
    requestPersistence()
    toast(`Imported ${pairs.length} cards`)
    navigate(`/deck/${deckId}`, true)
  }

  if (deck === null) return <NotFound />
  if (!deck) return null

  return (
    <>
      <Header back={{ href: `/deck/${deckId}` }} title="Import cards" />
      <main className="page stack">
        <p className="muted">
          One card per line. Front and back separated by a tab, comma, or semicolon. Works with spreadsheets (copy two columns
          and paste) and Quizlet exports.
        </p>
        <textarea
          className="mono"
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'hola\thello\ngracias\tthank you'}
        />
        <label className="btn block">
          Choose a .csv or .txt file
          <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
        <div className="field">
          <span>Separator</span>
          <div className="segmented">
            {DELIMS.map((d) => (
              <button key={d.label} className={delim === d.value ? 'on' : ''} onClick={() => setDelim(d.value)}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <label className="check">
          <input type="checkbox" checked={header} onChange={(e) => setHeader(e.target.checked)} /> First line is a header
        </label>
        <label className="check">
          <input type="checkbox" checked={swap} onChange={(e) => setSwap(e.target.checked)} /> Swap front and back
        </label>
        {pairs.length > 0 && (
          <div className="preview-table">
            <div className="muted small">Preview</div>
            {pairs.slice(0, 5).map((p, i) => (
              <div key={i} className="preview-row">
                <span>{p.front}</span>
                <span>{p.back}</span>
              </div>
            ))}
            {pairs.length > 5 && <div className="muted small">...and {pairs.length - 5} more</div>}
          </div>
        )}
        <button className="btn primary big" disabled={!pairs.length} onClick={doImport}>
          Import {pairs.length || ''} {pairs.length === 1 ? 'card' : 'cards'} into {deck.name}
        </button>
      </main>
    </>
  )
}
