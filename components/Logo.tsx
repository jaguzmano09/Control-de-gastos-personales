export function Logo({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 112 112"
      fill="none"
      className={className}
      role="img"
      aria-label="PlaENC"
    >
      <g stroke="#1D5138" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 28h24c14 0 15 14 31 14h17" />
        <path d="M16 56h70" />
        <path d="M16 84h24c14 0 15-14 31-14h17" />
      </g>
      <g fill="#2F6F4E">
        <circle cx="16" cy="28" r="7" />
        <circle cx="16" cy="56" r="7" />
        <circle cx="16" cy="84" r="7" />
      </g>
      <circle cx="94" cy="56" r="11" fill="#B96D4B" />
    </svg>
  )
}
