/* Ícones da landing: chips "squircle" com gradiente + traço branco.
   Leem como mini-objetos 3D sem depender de assets externos. */

type IconName =
  | 'calendar'
  | 'palette'
  | 'bell'
  | 'card'
  | 'chart'
  | 'heart'
  | 'users'
  | 'megaphone'
  | 'clock'
  | 'shield'
  | 'ticket'
  | 'sparkle';

const PATHS: Record<IconName, React.ReactNode> = {
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="16" rx="3" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
      <path d="m8.5 14.5 2 2 4-4.5" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.3 0 2-1 2-2 0-1.3-1-1.6-1-2.8 0-.9.8-1.7 1.9-1.7H17a4 4 0 0 0 4-4A8.6 8.6 0 0 0 12 3Z" />
      <circle cx="7.5" cy="11" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="8" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  card: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="3" />
      <path d="M2.5 9.5h19M6.5 15h4" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V4M4 20h16" />
      <path d="M8 20v-6M12.5 20V9M17 20v-9" />
    </>
  ),
  heart: (
    <path d="M12 20s-7-4.4-9.2-8.6C1.3 8.6 2.6 5.3 5.8 5.3c1.9 0 3.2 1.2 4.2 2.6 1-1.4 2.3-2.6 4.2-2.6 3.2 0 4.5 3.3 3 6.1C19 15.6 12 20 12 20Z" />
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.6M17.5 20a5.5 5.5 0 0 0-2.4-4.5" />
    </>
  ),
  megaphone: (
    <>
      <path d="M4 10v4a1.5 1.5 0 0 0 1.5 1.5H7l1 4h2l-1-4 9 3.5V6L9 9.5H5.5A1.5 1.5 0 0 0 4 11Z" />
      <path d="M18 9a3 3 0 0 1 0 6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" />
      <path d="m9 12 2 2 4-4.5" />
    </>
  ),
  ticket: (
    <>
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h15A1.5 1.5 0 0 1 21 8.5v2a2 2 0 0 0 0 3.9v2A1.5 1.5 0 0 1 19.5 18h-15A1.5 1.5 0 0 1 3 16.5v-2a2 2 0 0 0 0-3.9Z" />
      <path d="M14 7v11" strokeDasharray="1.5 2.5" />
    </>
  ),
  sparkle: (
    <path d="M12 3c.5 3.8 1.7 5 5.5 5.5C13.7 9 12.5 10.2 12 14c-.5-3.8-1.7-5-5.5-5.5C10.3 8 11.5 6.8 12 3Z" />
  ),
};

const GRADIENTS: Record<string, [string, string]> = {
  teal: ['#2dd4bf', '#0f766e'],
  violet: ['#a78bfa', '#7c3aed'],
  amber: ['#fbbf24', '#d97706'],
  coral: ['#fb7185', '#e11d48'],
  sky: ['#38bdf8', '#0284c7'],
  lime: ['#4ade80', '#16a34a'],
};

export function IconTile({
  name,
  tone = 'teal',
  size = 56,
  className = '',
}: {
  name: IconName;
  tone?: keyof typeof GRADIENTS;
  size?: number;
  className?: string;
}) {
  const [from, to] = GRADIENTS[tone] ?? GRADIENTS.teal;
  const gid = `lp-icg-${name}-${tone}`;
  return (
    <span
      className={`lp-icon-tile ${className}`}
      style={{
        width: size,
        height: size,
        display: 'grid',
        placeItems: 'center',
        borderRadius: size * 0.32,
        background: `linear-gradient(145deg, ${from}, ${to})`,
        boxShadow: `inset 0 2px 6px rgba(255,255,255,.45), inset 0 -4px 8px rgba(0,0,0,.18), 0 10px 22px -8px ${to}88`,
      }}
      aria-hidden="true"
    >
      <svg
        width={size * 0.54}
        height={size * 0.54}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1" />
        </defs>
        {PATHS[name]}
      </svg>
    </span>
  );
}

export type { IconName };
