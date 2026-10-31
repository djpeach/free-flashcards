import { useEffect, useState } from 'react'
import { Header } from '@/components/Header'
import { db, newId } from '@/db'
import { navigate } from '@/router'

export function DeckForm({ deckId }: { deckId?: string }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [newPerDay, setNewPerDay] = useState('')
  const [loaded, setLoaded] = useState(!deckId)

  useEffect(() => {
    if (!deckId) return
    db.decks.get(deckId).then((d) => {
      if (!d) return navigate('/', true)
      setName(d.name)
      setDescription(d.description)
      setNewPerDay(d.newPerDay == null ? '' : String(d.newPerDay))
      setLoaded(true)
    })
  }, [deckId])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const now = Date.now()
    const limit = newPerDay.trim() === '' ? undefined : Math.max(0, Math.floor(Number(newPerDay)) || 0)
    const clean = { name: name.trim() || 'Untitled deck', description: description.trim(), newPerDay: limit }
    if (deckId) {
      await db.decks.update(deckId, { ...clean, updatedAt: now })
      navigate(`/deck/${deckId}`, true)
    } else {
      const id = newId()
      await db.decks.add({ id, ...clean, createdAt: now, updatedAt: now })
      navigate(`/deck/${id}`, true)
    }
  }

  if (!loaded) return null
  return (
    <>
      <Header back={{ href: deckId ? `/deck/${deckId}` : '/' }} title={deckId ? 'Edit deck' : 'New deck'} />
      <main className="page">
        <form className="stack" onSubmit={save}>
          <label className="field">
            <span>Name</span>
            <input autoFocus={!deckId} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Spanish verbs" />
          </label>
          <label className="field">
            <span>
              Description <span className="muted">(optional)</span>
            </span>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="field">
            <span>
              New cards per day <span className="muted">(optional)</span>
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={9999}
              value={newPerDay}
              onChange={(e) => setNewPerDay(e.target.value)}
              placeholder="No limit"
            />
            <small className="muted">Leave blank to study every new card. Set a number to spread them out over days.</small>
          </label>
          <button className="btn primary big" type="submit">
            {deckId ? 'Save' : 'Create deck'}
          </button>
        </form>
      </main>
    </>
  )
}
