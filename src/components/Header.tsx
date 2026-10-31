export function Header({
  back,
  title,
  actions,
}: {
  back?: { href: string; label?: string }
  title?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <header className="topbar">
      <div className="topbar-side">
        {back && (
          <a className="back" href={`#${back.href}`}>
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M12.5 4 6.5 10l6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {back.label ?? 'Back'}
          </a>
        )}
      </div>
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-side right">{actions}</div>
    </header>
  )
}
