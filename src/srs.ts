import { createEmptyCard, fsrs, State, type Card as FsrsCard, type Grade } from 'ts-fsrs'
import type { Card, SrsState } from '@/db'

export { Rating, State } from 'ts-fsrs'
export type { Grade }

const scheduler = fsrs({ enable_fuzz: true })

export const LEARN_AHEAD_MS = 20 * 60 * 1000

function toFsrs(s: SrsState): FsrsCard {
  return {
    ...s,
    due: new Date(s.due),
    state: s.state as State,
    last_review: s.last_review ? new Date(s.last_review) : undefined,
  }
}

function fromFsrs(c: FsrsCard): SrsState {
  const out: SrsState = {
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
  }
  if (c.last_review) out.last_review = c.last_review.getTime()
  return out
}

export function newSrs(now = Date.now()): SrsState {
  return fromFsrs(createEmptyCard(new Date(now)))
}

export function answer(s: SrsState, grade: Grade, now = Date.now()): SrsState {
  return fromFsrs(scheduler.next(toFsrs(s), new Date(now), grade).card)
}

export function preview(s: SrsState, now = Date.now()): Record<Grade, number> {
  const p = scheduler.repeat(toFsrs(s), new Date(now))
  return {
    1: p[1].card.due.getTime() - now,
    2: p[2].card.due.getTime() - now,
    3: p[3].card.due.getTime() - now,
    4: p[4].card.due.getTime() - now,
  }
}

export function formatInterval(ms: number): string {
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`
  const min = Math.max(1, Math.round(ms / 60000))
  if (min < 60) return `${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} hr`
  const d = Math.round(h / 24)
  if (d < 31) return plural(d, 'day')
  const mo = Math.round(d / 30.4)
  if (mo < 12) return plural(mo, 'month')
  const y = d / 365
  return `${y < 10 ? y.toFixed(1).replace(/\.0$/, '') : Math.round(y)} years`
}

export const isNew = (c: Card) => c.srs.state === State.New
export const isLearning = (c: Card) => c.srs.state === State.Learning || c.srs.state === State.Relearning

export interface DeckCounts {
  newCount: number
  learning: number
  review: number
  total: number
}

export function deckCounts(cards: Card[], newLeft: number, now = Date.now()): DeckCounts {
  let fresh = 0
  let learning = 0
  let review = 0
  for (const c of cards) {
    if (isNew(c)) fresh++
    else if (isLearning(c)) {
      if (c.srs.due <= now + LEARN_AHEAD_MS) learning++
    } else if (c.srs.due <= now) review++
  }
  return { newCount: Math.min(fresh, Math.max(0, newLeft)), learning, review, total: cards.length }
}

export interface Session {
  pending: string[]
  learning: { id: string; due: number }[]
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function buildSession(cards: Card[], newLimit: number, now = Date.now(), order: <T>(arr: T[]) => T[] = shuffle): Session {
  const learning = cards
    .filter((c) => isLearning(c) && c.srs.due <= now + LEARN_AHEAD_MS)
    .map((c) => ({ id: c.id, due: c.srs.due }))
  const reviews = cards.filter((c) => !isNew(c) && !isLearning(c) && c.srs.due <= now)
  const fresh = cards
    .filter(isNew)
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, Math.max(0, newLimit))
  return { pending: interleave(order(reviews.map((c) => c.id)), order(fresh.map((c) => c.id))), learning }
}

function interleave(a: string[], b: string[]): string[] {
  if (!a.length || !b.length) return [...a, ...b]
  const out: string[] = []
  const step = (a.length + b.length) / b.length
  let ai = 0
  let bi = 0
  for (let i = 0; i < a.length + b.length; i++) {
    const wantB = bi < b.length && (ai >= a.length || Math.floor((i + 1) / step) > bi)
    out.push(wantB ? b[bi++] : a[ai++])
  }
  return out
}

export type NextPick = { id: string; from: 'pending' | 'learning' } | { id: null; waitUntil: number | null }

export function pickNext(s: Session, lastId: string | null, now = Date.now()): NextPick {
  const learning = [...s.learning].sort((a, b) => a.due - b.due)
  const dueLearning = learning.find((l) => l.due <= now && (l.id !== lastId || s.pending.length === 0))
  if (dueLearning) return { id: dueLearning.id, from: 'learning' }
  if (s.pending.length) return { id: s.pending[0], from: 'pending' }
  const ahead = learning.find((l) => l.due <= now + LEARN_AHEAD_MS)
  if (ahead) return { id: ahead.id, from: 'learning' }
  return { id: null, waitUntil: learning[0]?.due ?? null }
}

export function afterAnswer(s: Session, id: string, next: SrsState, now = Date.now()): Session {
  const pending = s.pending.filter((p) => p !== id)
  const learning = s.learning.filter((l) => l.id !== id)
  const stillLearning = next.state === State.Learning || next.state === State.Relearning
  if (stillLearning && next.due <= now + LEARN_AHEAD_MS) learning.push({ id, due: next.due })
  return { pending, learning }
}
