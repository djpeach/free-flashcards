import { db, DEFAULT_NEW_PER_DAY, newId } from '@/db'
import { newSrs } from '@/srs'

const CAPITALS: [string, string][] = [
  ['Capital of Japan?', 'Tokyo'],
  ['Capital of Canada?', 'Ottawa'],
  ['Capital of Australia?', 'Canberra'],
  ['Capital of Brazil?', 'Brasília'],
  ['Capital of Kenya?', 'Nairobi'],
  ['Capital of Norway?', 'Oslo'],
  ['Capital of Egypt?', 'Cairo'],
  ['Capital of Peru?', 'Lima'],
  ['Capital of Vietnam?', 'Hanoi'],
  ['Capital of Turkey?', 'Ankara'],
]

export async function createSampleDeck(): Promise<string> {
  const now = Date.now()
  const deckId = newId()
  await db.transaction('rw', db.decks, db.cards, async () => {
    await db.decks.add({
      id: deckId,
      name: 'World capitals (sample)',
      description: 'A small deck to try things out. Delete it whenever.',
      newPerDay: DEFAULT_NEW_PER_DAY,
      createdAt: now,
      updatedAt: now,
    })
    await db.cards.bulkAdd(
      CAPITALS.map(([front, back], i) => ({
        id: newId(),
        deckId,
        front,
        back,
        srs: newSrs(now),
        createdAt: now + i,
        updatedAt: now + i,
      })),
    )
  })
  return deckId
}
