import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId } from '@/db'

const MAX_DIM = 1280
const KEEP_ORIGINAL_UNDER = 350 * 1024
const PASSTHROUGH = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read that image.'))
    img.src = url
  })
}

export async function prepareImage(file: Blob): Promise<{ type: string; data: ArrayBuffer }> {
  if (file.size <= KEEP_ORIGINAL_UNDER && PASSTHROUGH.includes(file.type)) {
    return { type: file.type, data: await file.arrayBuffer() }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not compress image.'))), 'image/jpeg', 0.85),
    )
    return { type: 'image/jpeg', data: await blob.arrayBuffer() }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function saveImage(file: Blob): Promise<string> {
  const { type, data } = await prepareImage(file)
  const id = newId()
  await db.images.put({ id, type, data, createdAt: Date.now() })
  return id
}

export function useImageUrl(id: string | undefined | null): string | null {
  const rec = useLiveQuery(() => (id ? db.images.get(id) : undefined), [id])
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!rec) {
      setUrl(null)
      return
    }
    const u = URL.createObjectURL(new Blob([rec.data], { type: rec.type }))
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [rec])
  return url
}
