export function Logo({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="2" width="28" height="28" rx="9" className="fill-ledger-green" />
      <rect x="9" y="7" width="14" height="18" rx="3" className="fill-white" />
      <rect x="12" y="11" width="8" height="2" rx="1" className="fill-ledger-green" />
      <rect x="12" y="15" width="6" height="2" rx="1" className="fill-ledger-muted" />
      <rect x="12" y="19" width="8" height="2" rx="1" className="fill-ledger-green" />
    </svg>
  )
}