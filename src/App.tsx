import { UpdateBanner } from '@/components/Banners'
import { CardEditor } from '@/pages/CardEditor'
import { DeckPage, NotFound } from '@/pages/Deck'
import { DeckForm } from '@/pages/DeckForm'
import { Home } from '@/pages/Home'
import { ImportText } from '@/pages/ImportText'
import { Drill } from '@/pages/Drill'
import { Settings } from '@/pages/Settings'
import { Study } from '@/pages/Study'
import { useRoute } from '@/router'
import { useToast } from '@/toast'

function Route() {
  const { path } = useRoute()
  const [a, id, sub] = path
  if (!a) return <Home />
  if (a === 'settings') return <Settings />
  if (a === 'new-deck') return <DeckForm />
  if (a === 'card' && id) return <CardEditor key={id} cardId={id} />
  if (a === 'deck' && id) {
    if (!sub) return <DeckPage deckId={id} />
    if (sub === 'edit') return <DeckForm deckId={id} />
    if (sub === 'add') return <CardEditor deckId={id} />
    if (sub === 'study') return <Study deckId={id} />
    if (sub === 'drill') return <Drill deckId={id} />
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
