import { useEffect, useState } from 'react'
import { backupFileName, createBackup, importBackup, lastBackupAt, markBackedUp, saveFile } from '@/backup'
import { InstallHelp } from '@/components/Banners'
import { Header } from '@/components/Header'
import { db } from '@/db'
import { requestPersistence } from '@/install'
import { navigate } from '@/router'
import { toast } from '@/toast'

function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`
}

export function Settings() {
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [last, setLast] = useState(lastBackupAt)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => setUsage({ used: e.usage ?? 0, quota: e.quota ?? 0 }))
    navigator.storage?.persisted?.().then(setPersisted)
  }, [])

  async function exportAll() {
    setBusy(true)
    try {
      const data = await createBackup()
      await saveFile(backupFileName('backup'), JSON.stringify(data))
      markBackedUp()
      setLast(lastBackupAt())
    } finally {
      setBusy(false)
    }
  }

  async function restore(file: File) {
    setBusy(true)
    try {
      const res = await importBackup(JSON.parse(await file.text()))
      toast(`Imported ${res.decks} ${res.decks === 1 ? 'deck' : 'decks'}, ${res.cards} cards`)
      requestPersistence()
      navigate('/')
    } catch (e) {
      alert(e instanceof SyntaxError ? "That file isn't valid JSON." : (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function eraseAll() {
    if (!confirm('Erase ALL decks, cards, and images on this device? This cannot be undone.')) return
    if (!confirm('Really erase everything? Consider exporting a backup first.')) return
    await db.transaction('rw', db.decks, db.cards, db.images, db.reviews, async () => {
      await Promise.all([db.decks.clear(), db.cards.clear(), db.images.clear(), db.reviews.clear()])
    })
    toast('Everything erased')
    navigate('/')
  }

  return (
    <>
      <Header back={{ href: '/', label: 'Decks' }} title="Settings" />
      <main className="page">
        <section className="card stack-sm">
          <h2>Backup</h2>
          <p className="muted small">
            Your cards live only on this device. Nothing is uploaded anywhere. Save a backup now and then, and use it to move
            your cards to another device.
          </p>
          <p className="small">Last backup: {last ? new Date(last).toLocaleDateString() : 'never'}</p>
          <button className="btn primary block" onClick={exportAll} disabled={busy}>
            Export everything
          </button>
          <label className={`btn block ${busy ? 'disabled' : ''}`}>
            Import a backup or shared deck
            <input
              type="file"
              accept=".json,application/json"
              hidden
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) restore(f)
              }}
            />
          </label>
          <p className="muted small">Importing merges into what you have. Cards that already exist are updated, not duplicated.</p>
        </section>

        <section className="card stack-sm">
          <h2>Install</h2>
          <InstallHelp />
        </section>

        <section className="card stack-sm">
          <h2>Storage</h2>
          {usage && (
            <p className="small">
              Using {formatBytes(usage.used)}
              {usage.quota ? ` of about ${formatBytes(usage.quota)} available` : ''}.
            </p>
          )}
          {persisted === true && <p className="small">✓ Storage is marked persistent, so the browser won't clear it on its own.</p>}
          {persisted === false && (
            <>
              <p className="small muted">
                Your browser may clear site data if the device runs low on space or the app goes unused for a while. Installing to
                your home screen helps a lot.
              </p>
              <button className="btn block" onClick={async () => setPersisted(await requestPersistence())}>
                Ask to keep my data
              </button>
            </>
          )}
        </section>

        <section className="card stack-sm">
          <h2>Keyboard shortcuts</h2>
          <p className="small muted">
            Space to flip. 1 to 4 to rate (Wrong, Hard, Ok, Easy). Z to undo. In Free Drill, 1 is missed and 2 is got it.
          </p>
        </section>

        <section className="options">
          <button className="btn block danger-text" onClick={eraseAll}>
            Erase all data on this device
          </button>
          <p className="muted small center">Free Flashcards. No accounts, no ads, no tracking.</p>
        </section>
      </main>
    </>
  )
}
