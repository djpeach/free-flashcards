import { useEffect, useRef } from 'react'

export function useKeys(handler: (key: string) => void) {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey || t.closest('input, textarea, select')) return
      if (e.key === ' ' || e.key === 'Enter') e.preventDefault()
      ref.current(e.key)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
