export function AgenderLogo({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const h = size === 'sm' ? 28 : size === 'lg' ? 48 : 36;

  return (
    <svg
      viewBox="0 0 500 88"
      height={h}
      style={{ width: 'auto' }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Agender"
      role="img"
      className={className}
    >
      <defs>
        <linearGradient id="agdr-pen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EC407A" />
          <stop offset="14%" stopColor="#EC407A" />
          <stop offset="18%" stopColor="#FFD54F" />
          <stop offset="80%" stopColor="#F9A825" />
          <stop offset="100%" stopColor="#EF6C00" />
        </linearGradient>
        <linearGradient id="agdr-txt" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#15803D" />
          <stop offset="60%" stopColor="#1E6B4A" />
          <stop offset="100%" stopColor="#1a1a1a" />
        </linearGradient>
      </defs>

      {/* ===== "A" mark ===== */}
      <g>
        <path d="M8,78 L40,8 L56,8 L24,78 Z" fill="var(--color-primary-default, #16A34A)" />
        <path d="M56,8 L72,8 L104,78 L84,78 Z" fill="var(--color-primary-default, #16A34A)" />
        <rect x="26" y="50" width="18" height="8" rx="1.5" fill="var(--color-primary-default, #16A34A)" />
        <rect x="60" y="50" width="22" height="8" rx="1.5" fill="var(--color-primary-default, #16A34A)" />

        {/* Pencil */}
        <rect x="48" y="2" width="12" height="56" rx="3" fill="url(#agdr-pen)" />
        <path d="M48,54 L60,54 L54,70" fill="#5D4037" />
        <path d="M51,62 L57,62 L54,70" fill="#455A64" />
      </g>

      {/* ===== "gender" — gradient + expressive font ===== */}
      <text
        x="114"
        y="72"
        fontFamily="'Georgia', 'Playfair Display', 'Times New Roman', serif"
        fontWeight="700"
        fontStyle="italic"
        fontSize="60"
        letterSpacing="-1"
        fill="url(#agdr-txt)"
      >gender</text>
    </svg>
  );
}
