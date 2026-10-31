import Dexie, { type EntityTable } from 'dexie'

export interface SrsState {
  due: number
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: number
  last_review?: number
}

export interface Deck {
  id: string
  name: string
  description: string
  newPerDay?: number
  createdAt: number
  updatedAt: number
}

export interface Card {
  id: string
  deckId: string
  front: string
  back: string
  frontImage?: string
  backImage?: string
  notes?: string
  srs: SrsState
  createdAt: number
  updatedAt: number
}

export interface StoredImage {
  id: string
  type: string
  data: ArrayBuffer
  createdAt: number
}

export interface Review {
  id?: number
  cardId: string
  deckId: string
  rating: number
  wasNew: boolean
  at: number
}

export class FlashDB extends Dexie {
  decks!: EntityTable<Deck, 'id'>
  cards!: EntityTable<Card, 'id'>
  images!: EntityTable<StoredImage, 'id'>
  reviews!: EntityTable<Review, 'id'>

  constructor(name = 'free-flashcards') {
    super(name)
    this.version(1).stores({
      decks: 'id, name',
      cards: 'id, deckId, srs.due',
      images: 'id',
      reviews: '++id, cardId, deckId, at',
    })
    // 20 used to be the default limit, so treat it as never chosen
    this.version(2).upgrade((tx) =>
      tx
        .table('decks')
        .toCollection()
        .modify((d: Deck) => {
          if (d.newPerDay === 20) delete d.newPerDay
        }),
    )
  }
}

export const db = new FlashDB()

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 12)
}

export function newCardsLeft(deck: Deck, newToday: number): number {
  return deck.newPerDay == null ? Infinity : deck.newPerDay - newToday
}

export function cardImageIds(card: Pick<Card, 'frontImage' | 'backImage'>): string[] {
  return [card.frontImage, card.backImage].filter((x): x is string => !!x)
}

export async function deleteCards(ids: string[]) {
  await db.transaction('rw', db.cards, db.images, db.reviews, async () => {
    const cards = (await db.cards.bulkGet(ids)).filter((c): c is Card => !!c)
    await db.images.bulkDelete(cards.flatMap(cardImageIds))
    await db.reviews.where('cardId').anyOf(ids).delete()
    await db.cards.bulkDelete(ids)
  })
}

export async function deleteDeck(deckId: string) {
  await db.transaction('rw', db.decks, db.cards, db.images, db.reviews, async () => {
    const cards = await db.cards.where('deckId').equals(deckId).toArray()
    await db.images.bulkDelete(cards.flatMap(cardImageIds))
    await db.reviews.where('deckId').equals(deckId).delete()
    await db.cards.where('deckId').equals(deckId).delete()
    await db.decks.delete(deckId)
  })
}

export function startOfToday(now = Date.now()): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export async function newCardsStudiedToday(deckId: string, now = Date.now()): Promise<number> {
  return db.reviews
    .where('at')
    .aboveOrEqual(startOfToday(now))
    .filter((r) => r.deckId === deckId && r.wasNew)
    .count()
}
