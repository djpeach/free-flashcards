import { describe, expect, it } from 'vitest'
import { newCardsLeft, type Card, type Deck } from '@/db'
import { afterAnswer, answer, buildSession, deckCounts, formatInterval, newSrs, pickNext, Rating, State } from '@/srs'

const inOrder = <T>(arr: T[]) => arr

const NOW = new Date('2026-01-10T12:00:00').getTime()
const MIN = 60_000
const DAY = 24 * 60 * MIN

function card(id: string, srs = newSrs(NOW), createdAt = 0): Card {
  return { id, deckId: 'd', front: id, back: id, srs, createdAt, updatedAt: createdAt }
}

describe('answer', () => {
  it('moves a new card into learning on Again and Good', () => {
    const again = answer(newSrs(NOW), Rating.Again, NOW)
    expect(again.state).toBe(State.Learning)
    expect(again.due - NOW).toBeLessThan(10 * MIN)
    expect(again.reps).toBe(1)
  })

  it('graduates a new card on Easy to days out', () => {
    const easy = answer(newSrs(NOW), Rating.Easy, NOW)
    expect(easy.state).toBe(State.Review)
    expect(easy.due - NOW).toBeGreaterThanOrEqual(DAY)
  })

  it('grows intervals on repeated Good reviews', () => {
    let s = newSrs(NOW)
    let t = NOW
    const intervals: number[] = []
    for (let i = 0; i < 6; i++) {
      s = answer(s, Rating.Good, t)
      intervals.push(s.due - t)
      t = s.due
    }
    expect(s.state).toBe(State.Review)
    expect(intervals.at(-1)!).toBeGreaterThan(intervals[2])
  })
})

describe('session', () => {
  it('limits new cards and orders them by creation', () => {
    const cards = [card('c', newSrs(NOW), 3), card('a', newSrs(NOW), 1), card('b', newSrs(NOW), 2)]
    expect(buildSession(cards, 2, NOW, inOrder).pending).toEqual(['a', 'b'])
    expect(buildSession(cards, 0, NOW).pending).toEqual([])
  })

  it('shuffles the session but still introduces the oldest new cards first', () => {
    const cards = Array.from({ length: 40 }, (_, i) => card(`c${i}`, newSrs(NOW), i))
    const oldest = cards.slice(0, 20).map((c) => c.id)
    const runs = Array.from({ length: 5 }, () => buildSession(cards, 20, NOW).pending)
    for (const r of runs) expect([...r].sort()).toEqual([...oldest].sort())
    expect(runs.some((r) => r.join() !== oldest.join())).toBe(true)
  })

  it('includes every new card when the deck has no limit', () => {
    const deck: Deck = { id: 'd', name: 'D', description: '', createdAt: 0, updatedAt: 0 }
    const cards = Array.from({ length: 30 }, (_, i) => card(`c${i}`, newSrs(NOW), i))
    expect(buildSession(cards, newCardsLeft(deck, 25), NOW).pending).toHaveLength(30)
    expect(deckCounts(cards, newCardsLeft(deck, 25), NOW).newCount).toBe(30)
    expect(newCardsLeft({ ...deck, newPerDay: 20 }, 5)).toBe(15)
  })

  it('includes due reviews and skips future ones', () => {
    const due = card('due', { ...answer(newSrs(NOW - 10 * DAY), Rating.Easy, NOW - 10 * DAY) })
    const future = card('future', { ...answer(newSrs(NOW), Rating.Easy, NOW) })
    const s = buildSession([due, future], 0, NOW)
    expect(s.pending).toEqual(['due'])
    expect(deckCounts([due, future], 0, NOW)).toMatchObject({ review: 1, newCount: 0, total: 2 })
  })

  it('brings an Again card back after other cards, then learns ahead when alone', () => {
    const cards = [card('a', newSrs(NOW), 1), card('b', newSrs(NOW), 2)]
    let s = buildSession(cards, 10, NOW, inOrder)
    expect(pickNext(s, null, NOW)).toMatchObject({ id: 'a' })
    const a = answer(cards[0].srs, Rating.Again, NOW)
    s = afterAnswer(s, 'a', a, NOW)
    expect(s.learning.map((l) => l.id)).toEqual(['a'])
    expect(pickNext(s, 'a', NOW)).toMatchObject({ id: 'b' })
    const b = answer(cards[1].srs, Rating.Easy, NOW)
    s = afterAnswer(s, 'b', b, NOW)
    expect(pickNext(s, 'b', NOW)).toMatchObject({ id: 'a', from: 'learning' })
    s = afterAnswer(s, 'a', answer(a, Rating.Easy, NOW), NOW)
    expect(pickNext(s, 'a', NOW)).toEqual({ id: null, waitUntil: null })
  })
})

describe('formatInterval', () => {
  it('formats', () => {
    expect(formatInterval(30_000)).toBe('1 min')
    expect(formatInterval(10 * MIN)).toBe('10 min')
    expect(formatInterval(3 * 60 * MIN)).toBe('3 hr')
    expect(formatInterval(4 * DAY)).toBe('4 days')
    expect(formatInterval(90 * DAY)).toBe('3 months')
    expect(formatInterval(DAY)).toBe('1 day')
    expect(formatInterval(400 * DAY)).toBe('1.1 years')
  })
})
