// The Vera mark: an italic Newsreader V inside a score ring (87% filled). Same drawing as brand/build.mjs markRing().
export default function Mark({ size = 40, color = '#941900', track = '#E7E5E4', className = '' }: { size?: number; color?: string; track?: string; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden>
      <circle cx="50" cy="50" r="44" fill="none" stroke={track} strokeWidth="5" />
      <circle cx="50" cy="50" r="44" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" pathLength={100} strokeDasharray="87 100" transform="rotate(-90 50 50)" />
      <text x="48" y="73" textAnchor="middle" fontFamily="var(--font-newsreader), Georgia, serif" fontStyle="italic" fontWeight="700" fontSize="66" fill={color}>V</text>
    </svg>
  );
}
