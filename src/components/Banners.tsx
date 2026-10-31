import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { isAndroid, isIOS, isStandalone, useInstallPrompt } from '@/install'

export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  if (!needRefresh) return null
  return (
    <div className="banner">
      <span>A new version is ready.</span>
      <div className="row">
        <button className="btn small" onClick={() => setNeedRefresh(false)}>
          Later
        </button>
        <button className="btn small primary" onClick={() => updateServiceWorker(true)}>
          Update
        </button>
      </div>
    </div>
  )
}

export function InstallHelp() {
  const { canPrompt, prompt } = useInstallPrompt()
  if (isStandalone()) return <p className="muted">Installed. Nice.</p>
  if (canPrompt)
    return (
      <button className="btn primary" onClick={prompt}>
        Install app
      </button>
    )
  if (isIOS())
    return (
      <ol className="steps">
        <li>
          Tap the <strong>Share</strong> button (in Safari it may be under the <strong>•••</strong> menu).
        </li>
        <li>
          Choose <strong>Add to Home Screen</strong>.
        </li>
        <li>Open Flashcards from your home screen.</li>
      </ol>
    )
  if (isAndroid())
    return (
      <ol className="steps">
        <li>
          Open your browser menu (<strong>⋮</strong>).
        </li>
        <li>
          Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.
        </li>
      </ol>
    )
  return <p className="muted">Use your browser's install button (usually in the address bar), or open this page on your phone.</p>
}

export function InstallBanner() {
  const [hidden, setHidden] = useState(() => localStorage.getItem('installDismissed') === '1')
  const { canPrompt } = useInstallPrompt()
  const mobile = isIOS() || isAndroid()
  if (hidden || isStandalone() || (!mobile && !canPrompt)) return null
  return (
    <div className="card install">
      <div className="row space">
        <strong>Add Flashcards to your home screen</strong>
        <button
          className="btn small ghost"
          aria-label="Dismiss"
          onClick={() => {
            localStorage.setItem('installDismissed', '1')
            setHidden(true)
          }}
        >
          ✕
        </button>
      </div>
      <p className="muted small">It works offline, opens full screen, and keeps your cards safer on iPhone.</p>
      <InstallHelp />
    </div>
  )
}
