import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Header } from '@/components/Header'
import { ImageField } from '@/components/ImageField'
import { db, deleteCards, newId, type Card } from '@/db'
import { saveImage } from '@/images'
import { requestPersistence } from '@/install'
import { navigate } from '@/router'
import { newSrs } from '@/srs'
import { toast } from '@/toast'

interface Img {
  id?: string
  file?: File
  url?: string
}

function useImg(): [Img, (next: Img) => void] {
  const [img, setImg] = useState<Img>({})
  const set = (next: Img) => {
    setImg((prev) => {
      if (prev.url) URL.revokeObjectURL(prev.url)
      return next
    })
  }
  return [img, set]
}

async function resolveImg(img: Img, original: string | undefined): Promise<string | undefined> {
  let id = img.id
  if (img.file) id = await saveImage(img.file)
  if (original && original !== id) await db.images.delete(original)
  return id
}

function imageFromPaste(e: React.ClipboardEvent): File | null {
  for (const item of e.clipboardData.items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) return item.getAsFile()
  }
  return null
}

export function CardEditor({
  deckId: initialDeckId,
  cardId,
  onClose,
}: {
  deckId?: string
  cardId?: string
  onClose?: () => void
}) {
  const decks = useLiveQuery(() => db.decks.orderBy('name').toArray())
  const [original, setOriginal] = useState<Card | null>(null)
  const [deckId, setDeckId] = useState(initialDeckId ?? '')
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [notes, setNotes] = useState('')
  const [frontImg, setFrontImg] = useImg()
  const [backImg, setBackImg] = useImg()
  const [saving, setSaving] = useState(false)
  const [added, setAdded] = useState(0)
  const frontRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!cardId) return
    db.cards.get(cardId).then((c) => {
      if (!c) return onClose ? onClose() : navigate('/', true)
      setOriginal(c)
      setDeckId(c.deckId)
      setFront(c.front)
      setBack(c.back)
      setNotes(c.notes ?? '')
      setFrontImg({ id: c.frontImage })
      setBackImg({ id: c.backImage })
    })
  }, [cardId])

  const pick = (set: (i: Img) => void) => (file: File) => set({ file, url: URL.createObjectURL(file) })
  const pasteInto = (set: (i: Img) => void) => (e: React.ClipboardEvent) => {
    const f = imageFromPaste(e)
    if (f) {
      e.preventDefault()
      pick(set)(f)
    }
  }

  const isEmpty = !front.trim() && !back.trim() && !frontImg.id && !frontImg.file && !backImg.id && !backImg.file

  async function save(addAnother: boolean) {
    if (isEmpty || saving) return
    setSaving(true)
    try {
      const now = Date.now()
      const frontImage = await resolveImg(frontImg, original?.frontImage)
      const backImage = await resolveImg(backImg, original?.backImage)
      const cleanNotes = notes.trim() || undefined
      if (original) {
        await db.cards.put({ ...original, deckId, front, back, frontImage, backImage, notes: cleanNotes, updatedAt: now })
        toast('Saved')
        if (onClose) onClose()
        else navigate(`/deck/${deckId}`, true)
      } else {
        await db.cards.add({ id: newId(), deckId, front, back, frontImage, backImage, notes: cleanNotes, srs: newSrs(now), createdAt: now, updatedAt: now })
        requestPersistence()
        if (!addAnother) {
          toast('Card saved')
          navigate(`/deck/${deckId}`, true)
          return
        }
        setFront('')
        setBack('')
        setNotes('')
        setFrontImg({})
        setBackImg({})
        setAdded((n) => n + 1)
        toast('Card saved. Add another.')
        frontRef.current?.focus()
      }
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!original || !confirm('Delete this card?')) return
    await deleteCards([original.id])
    toast('Card deleted')
    navigate(`/deck/${original.deckId}`, true)
  }

  async function resetProgress() {
    if (!original || !confirm('Reset this card to new? Its review history is cleared.')) return
    const srs = newSrs()
    await db.cards.update(original.id, { srs })
    await db.reviews.where('cardId').equals(original.id).delete()
    setOriginal({ ...original, srs })
    toast('Progress reset')
  }

  if (cardId && !original) return null
  const backHref = `/deck/${original?.deckId ?? initialDeckId}`

  return (
    <>
      <Header
        back={onClose ? { onClick: onClose, label: 'Cancel' } : { href: backHref, label: added ? 'Done' : 'Back' }}
        title={original ? 'Edit card' : 'Add card'}
      />
      <main className="page">
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault()
            save(!original)
          }}
        >
          {!onClose && decks && decks.length > 1 && (
            <label className="field">
              <span>Deck</span>
              <select value={deckId} onChange={(e) => setDeckId(e.target.value)}>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="side-editor">
            <label className="field">
              <span>Front</span>
              <textarea
                ref={frontRef}
                autoFocus={!cardId}
                rows={3}
                value={front}
                onChange={(e) => setFront(e.target.value)}
                onPaste={pasteInto(setFrontImg)}
                placeholder="Question, word, prompt..."
              />
            </label>
            <ImageField
              imageId={frontImg.id}
              pendingUrl={frontImg.url}
              onPick={pick(setFrontImg)}
              onRemove={() => setFrontImg({})}
            />
          </div>
          <div className="side-editor">
            <label className="field">
              <span>Back</span>
              <textarea
                rows={3}
                value={back}
                onChange={(e) => setBack(e.target.value)}
                onPaste={pasteInto(setBackImg)}
                placeholder="Answer"
              />
            </label>
            <ImageField imageId={backImg.id} pendingUrl={backImg.url} onPick={pick(setBackImg)} onRemove={() => setBackImg({})} />
          </div>
          <label className="field">
            <span>
              Notes <span className="muted">(optional)</span>
            </span>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Extra context, a mnemonic, where it came from..."
            />
            <small className="muted">Tap Notes while studying to see it.</small>
          </label>
          {original ? (
            <button className="btn primary big" type="submit" disabled={isEmpty || saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          ) : (
            <div className="stack-sm">
              <button className="btn primary big" type="submit" disabled={isEmpty || saving}>
                Save & Add Another
              </button>
              <button className="btn big" type="button" disabled={isEmpty || saving} onClick={() => save(false)}>
                Save & Done
              </button>
              {added > 0 && (
                <p className="muted center small">
                  {added} saved so far
                </p>
              )}
            </div>
          )}
        </form>

        {original && !onClose && (
          <section className="options">
            <button className="btn block" onClick={resetProgress}>
              Reset progress
            </button>
            <button className="btn block danger-text" onClick={remove}>
              Delete card
            </button>
          </section>
        )}
      </main>
    </>
  )
}
