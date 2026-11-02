export function Logo({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      role="img"
      aria-label="Control de gastos"
    >
      <rect width="40" height="40" rx="13" className="fill-ledger-green" />
      <path
        d="M11 14.5A3.5 3.5 0 0 1 14.5 11H28a4 4 0 0 1 4 4v13.5A3.5 3.5 0 0 1 28.5 32H14.5a3.5 3.5 0 0 1-3.5-3.5v-14Z"
        className="fill-white"
      />
      <path
        d="M11 16h17.5A3.5 3.5 0 0 1 32 19.5v5H27a4 4 0 0 1 0-8h5"
        className="fill-ledger-green-dark"
      />
      <circle cx="27" cy="20.5" r="1.5" className="fill-white" />
      <path d="M15 14h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-ledger-green" />
    </svg>
  )
}