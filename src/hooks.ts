import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, startOfToday, type Card } from '@/db'
import { deckCounts, type DeckCounts } from '@/srs'

export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    const onVisible = () => document.visibilityState === 'visible' && setNow(Date.now())
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [intervalMs])
  return now
}

export function useAllDeckCounts(now: number): Map<string, DeckCounts> | undefined {
  return useLiveQuery(async () => {
    const [decks, cards, todays] = await Promise.all([
      db.decks.toArray(),
      db.cards.toArray(),
      db.reviews.where('at').aboveOrEqual(startOfToday(now)).toArray(),
    ])
    const byDeck = new Map<string, Card[]>()
    for (const c of cards) byDeck.set(c.deckId, [...(byDeck.get(c.deckId) ?? []), c])
    const out = new Map<string, DeckCounts>()
    for (const d of decks) {
      const newToday = todays.filter((r) => r.deckId === d.id && r.wasNew).length
      out.set(d.id, deckCounts(byDeck.get(d.id) ?? [], d.newPerDay - newToday, now))
    }
    return out
  }, [now])
}
