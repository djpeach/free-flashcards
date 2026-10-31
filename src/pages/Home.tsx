import { useLiveQuery } from 'dexie-react-hooks'
import { lastBackupAt } from '@/backup'
import { InstallBanner } from '@/components/Banners'
import { Header } from '@/components/Header'
import { db } from '@/db'
import { useAllDeckCounts, useNow } from '@/hooks'
import { navigate } from '@/router'
import { createSampleDeck } from '@/samples'

const MONTH = 30 * 24 * 60 * 60 * 1000

export function Home() {
  const now = useNow()
  const decks = useLiveQuery(() => db.decks.orderBy('name').toArray())
  const counts = useAllDeckCounts(now)
  const cardTotal = useLiveQuery(() => db.cards.count())

  if (!decks) return null
  const last = lastBackupAt()
  const needsBackup = (cardTotal ?? 0) >= 25 && (!last || now - last > MONTH)

  return (
    <>
      <Header
        title="Flashcards"
        actions={
          <a className="icon-btn" href="#/settings" aria-label="Settings and backup">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1c.6.5 1.3.9 2 1.2l.4 2.6h4l.4-2.6c.7-.3 1.4-.7 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z"
              />
            </svg>
          </a>
        }
      />
      <main className="page">
        <InstallBanner />
        {needsBackup && (
          <a className="card notice" href="#/settings">
            <strong>Back up your cards</strong>
            <span className="muted small">They only live on this device. Tap to save a backup file.</span>
          </a>
        )}

        {decks.length === 0 ? (
          <div className="empty">
            <div className="empty-art" aria-hidden="true">
              🗂️
            </div>
            <h2>No decks yet</h2>
            <p className="muted">Make a deck, then add some cards. Everything stays on this device.</p>
            <div className="stack">
              <a className="btn primary big" href="#/new-deck">
                Create a deck
              </a>
              <button className="btn" onClick={async () => navigate(`/deck/${await createSampleDeck()}`)}>
                Try a sample deck
              </button>
              <a className="btn ghost" href="#/settings">
                Restore a backup
              </a>
            </div>
          </div>
        ) : (
          <>
            <ul className="deck-list">
              {decks.map((d) => {
                const c = counts?.get(d.id)
                const due = (c?.review ?? 0) + (c?.learning ?? 0)
                return (
                  <li key={d.id}>
                    <a className="deck-item" href={`#/deck/${d.id}`}>
                      <div className="deck-item-main">
                        <span className="deck-name">{d.name}</span>
                        <span className="muted small">
                          {c?.total ?? 0} {c?.total === 1 ? 'card' : 'cards'}
                        </span>
                      </div>
                      <div className="badges">
                        {due > 0 && <span className="badge due">{due} due</span>}
                        {(c?.newCount ?? 0) > 0 && <span className="badge new">{c!.newCount} new</span>}
                        {c && due === 0 && c.newCount === 0 && c.total > 0 && <span className="badge done">✓</span>}
                      </div>
                    </a>
                  </li>
                )
              })}
            </ul>
            <a className="btn primary block" href="#/new-deck">
              + New deck
            </a>
          </>
        )}
      </main>
    </>
  )
}
