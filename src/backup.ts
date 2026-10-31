import { db as defaultDb, type Card, type Deck, type FlashDB, type SrsState } from '@/db'
import { newSrs } from '@/srs'

export const FORMAT = 'free-flashcards'
export const VERSION = 1

export interface BackupCard extends Omit<Card, 'srs'> {
  srs?: SrsState
}

export interface Backup {
  format: typeof FORMAT
  version: number
  exportedAt: string
  decks: Deck[]
  cards: BackupCard[]
  images: { id: string; type: string; data: string }[]
}

export function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(bin)
}

export function base64ToBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

export async function createBackup(
  opts: { deckIds?: string[]; includeProgress?: boolean } = {},
  db: FlashDB = defaultDb,
): Promise<Backup> {
  const includeProgress = opts.includeProgress ?? true
  const decks = opts.deckIds ? (await db.decks.bulkGet(opts.deckIds)).filter((d): d is Deck => !!d) : await db.decks.toArray()
  const deckIds = decks.map((d) => d.id)
  const cards = await db.cards.where('deckId').anyOf(deckIds).toArray()
  const imageIds = cards.flatMap((c) => [c.frontImage, c.backImage]).filter((x): x is string => !!x)
  const images = (await db.images.bulkGet(imageIds)).filter((i) => !!i)
  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    decks,
    cards: cards.map(({ srs, ...rest }) => (includeProgress ? { ...rest, srs } : rest)),
    images: images.map((i) => ({ id: i.id, type: i.type, data: bufferToBase64(i.data) })),
  }
}

export function isBackup(x: unknown): x is Backup {
  const b = x as Backup
  return !!b && b.format === FORMAT && Array.isArray(b.decks) && Array.isArray(b.cards) && Array.isArray(b.images)
}

export async function importBackup(
  data: unknown,
  db: FlashDB = defaultDb,
): Promise<{ decks: number; cards: number; images: number }> {
  if (!isBackup(data)) throw new Error("That file isn't a Free Flashcards backup.")
  if (data.version > VERSION) throw new Error('That backup is from a newer version. Refresh the app and try again.')
  const now = Date.now()
  await db.transaction('rw', db.decks, db.cards, db.images, async () => {
    for (const d of data.decks) {
      await db.decks.put({
        id: String(d.id),
        name: String(d.name ?? 'Untitled deck'),
        description: String(d.description ?? ''),
        newPerDay: d.newPerDay == null ? undefined : Number(d.newPerDay),
        createdAt: Number(d.createdAt) || now,
        updatedAt: Number(d.updatedAt) || now,
      })
    }
    await db.images.bulkPut(
      data.images.map((i) => ({ id: i.id, type: i.type, data: base64ToBuffer(i.data), createdAt: now })),
    )
    const existing = new Map((await db.cards.bulkGet(data.cards.map((c) => c.id))).filter((c) => !!c).map((c) => [c.id, c]))
    await db.cards.bulkPut(
      data.cards.map((c) => ({
        id: String(c.id),
        deckId: String(c.deckId),
        front: String(c.front ?? ''),
        back: String(c.back ?? ''),
        frontImage: c.frontImage || undefined,
        backImage: c.backImage || undefined,
        srs: c.srs ?? existing.get(c.id)?.srs ?? newSrs(now),
        createdAt: Number(c.createdAt) || now,
        updatedAt: Number(c.updatedAt) || now,
      })),
    )
  })
  return { decks: data.decks.length, cards: data.cards.length, images: data.images.length }
}

export function backupFileName(label = 'backup'): string {
  const date = new Date().toISOString().slice(0, 10)
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'deck'
  return `flashcards-${slug}-${date}.json`
}

export async function saveFile(name: string, content: string, type = 'application/json') {
  const file = new File([content], name, { type })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  const isTouch = matchMedia('(pointer: coarse)').matches
  if (isTouch && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: name })
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function markBackedUp() {
  localStorage.setItem('lastBackupAt', String(Date.now()))
}

export function lastBackupAt(): number | null {
  const v = localStorage.getItem('lastBackupAt')
  return v ? Number(v) : null
}
