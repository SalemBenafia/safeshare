/**
 * Placeholder shapes while content loads. The pulse stops with prefers-reduced-motion.
 * Pass label="" when another live region already announces the loading state.
 */
export function Skeleton({ lines = 3, label = "Loading…", className = "" }: { lines?: number; label?: string; className?: string }) {
  const widths = ["w-11/12", "w-full", "w-4/5", "w-2/3", "w-5/6"];
  return (
    <div className={`space-y-2.5 ${className}`} role={label ? "status" : undefined}>
      {label && <span className="sr-only">{label}</span>}
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} aria-hidden="true" className={`h-3.5 animate-pulse rounded bg-line ${widths[i % widths.length]}`} />
      ))}
    </div>
  );
}
