import { useSyncExternalStore } from 'react'

function current(): string {
  return location.hash.replace(/^#/, '') || '/'
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function useRoute(): { path: string[]; query: URLSearchParams } {
  const raw = useSyncExternalStore(subscribe, current)
  const [p, q = ''] = raw.split('?')
  return { path: p.split('/').filter(Boolean), query: new URLSearchParams(q) }
}

export function navigate(path: string, replace = false) {
  const url = `#${path}`
  if (replace) {
    history.replaceState(null, '', url)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else location.hash = path
  window.scrollTo(0, 0)
}
