import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { base64ToBuffer, bufferToBase64, createBackup, importBackup } from '@/backup'
import { FlashDB } from '@/db'
import { answer, newSrs, Rating } from '@/srs'

async function seed(db: FlashDB) {
  const now = Date.now()
  await db.decks.add({ id: 'd1', name: 'Deck', description: '', newPerDay: 20, createdAt: now, updatedAt: now })
  await db.images.add({ id: 'img1', type: 'image/png', data: new Uint8Array([1, 2, 3, 250]).buffer, createdAt: now })
  await db.cards.add({
    id: 'c1',
    deckId: 'd1',
    front: 'Q',
    back: 'A',
    frontImage: 'img1',
    srs: answer(newSrs(now), Rating.Easy, now),
    createdAt: now,
    updatedAt: now,
  })
}

describe('backup', () => {
  it('base64 round trips binary', () => {
    const buf = new Uint8Array(100_000).map((_, i) => i % 256).buffer
    expect(new Uint8Array(base64ToBuffer(bufferToBase64(buf)))).toEqual(new Uint8Array(buf))
  })

  it('exports and restores into an empty db, including images and progress', async () => {
    const src = new FlashDB('src-' + Math.random())
    await seed(src)
    const backup = JSON.parse(JSON.stringify(await createBackup({}, src)))
    const dst = new FlashDB('dst-' + Math.random())
    expect(await importBackup(backup, dst)).toEqual({ decks: 1, cards: 1, images: 1 })
    const card = await dst.cards.get('c1')
    expect(card?.srs).toEqual((await src.cards.get('c1'))?.srs)
    const img = await dst.images.get('img1')
    expect([...new Uint8Array(img!.data)]).toEqual([1, 2, 3, 250])
  })

  it('shared decks without progress keep local progress on re-import', async () => {
    const db = new FlashDB('share-' + Math.random())
    await seed(db)
    const local = (await db.cards.get('c1'))!.srs
    const shared = JSON.parse(JSON.stringify(await createBackup({ deckIds: ['d1'], includeProgress: false }, db)))
    expect(shared.cards[0].srs).toBeUndefined()
    shared.cards[0].back = 'Updated'
    await importBackup(shared, db)
    const after = await db.cards.get('c1')
    expect(after?.back).toBe('Updated')
    expect(after?.srs).toEqual(local)
  })

  it('rejects junk', async () => {
    await expect(importBackup({ hello: 1 }, new FlashDB('junk'))).rejects.toThrow(/isn't a Free Flashcards backup/)
  })
})
