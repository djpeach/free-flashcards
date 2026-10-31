import { UpdateBanner } from '@/components/Banners'
import { CardEditor } from '@/pages/CardEditor'
import { DeckPage, NotFound } from '@/pages/Deck'
import { DeckForm } from '@/pages/DeckForm'
import { Home } from '@/pages/Home'
import { ImportText } from '@/pages/ImportText'
import { Practice } from '@/pages/Practice'
import { Settings } from '@/pages/Settings'
import { Study } from '@/pages/Study'
import { useRoute } from '@/router'
import { useToast } from '@/toast'

function Route() {
  const { path, query } = useRoute()
  const [a, id, sub] = path
  if (!a) return <Home />
  if (a === 'settings') return <Settings />
  if (a === 'new-deck') return <DeckForm />
  if (a === 'card' && id) return <CardEditor key={id} cardId={id} />
  if (a === 'deck' && id) {
    if (!sub) return <DeckPage deckId={id} />
    if (sub === 'edit') return <DeckForm deckId={id} />
    if (sub === 'add') return <CardEditor deckId={id} />
    if (sub === 'study') return <Study key={query.toString()} deckId={id} extra={Number(query.get('extra')) || 0} />
    if (sub === 'practice') return <Practice deckId={id} />
    if (sub === 'import') return <ImportText deckId={id} />
  }
  return <NotFound />
}

export function App() {
  const toast = useToast()
  return (
    <div className="app">
      <UpdateBanner />
      <Route />
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
