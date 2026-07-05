type Props = { className?: string; variant?: "full" | "icon"; withTagline?: boolean };

export function Logo({ className, variant = "full", withTagline = false }: Props) {
  if (variant === "icon") {
    return (
      <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden>
        <path d="M52 20 A22 22 0 1 0 54 34" stroke="#10B981" strokeWidth="5" strokeLinecap="round" />
        <path d="M20 33 L28 41 L46 22" stroke="#10B981" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <g stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" className="spark-pulse">
          <line x1="50" y1="10" x2="53" y2="4" />
          <line x1="56" y1="14" x2="62" y2="12" />
          <line x1="46" y1="6" x2="45" y2="1" />
        </g>
      </svg>
    );
  }
  return (
    <div className={className}>
      <div className="flex items-center gap-2.5">
        <svg viewBox="0 0 64 64" className="h-8 w-8 shrink-0" fill="none" aria-hidden>
          <path d="M52 20 A22 22 0 1 0 54 34" stroke="#10B981" strokeWidth="5" strokeLinecap="round" />
          <path d="M20 33 L28 41 L46 22" stroke="#10B981" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <g stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" className="spark-pulse">
            <line x1="50" y1="10" x2="53" y2="4" />
            <line x1="56" y1="14" x2="62" y2="12" />
            <line x1="46" y1="6" x2="45" y2="1" />
          </g>
        </svg>
        <span className="font-display text-2xl font-extrabold tracking-tight text-ink leading-none">
          seen<span className="text-brand">zo</span>
        </span>
      </div>
      {withTagline && (
        <div className="mt-1 pl-[42px] text-[11px] font-medium tracking-widest text-slate-500 uppercase">
          by KlivIQ
        </div>
      )}
    </div>
  );
}