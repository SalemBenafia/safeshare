/** The SafeShare shield: a shield with a check mark. Decorative unless a title is given. */
export function ShieldIcon({ className = "size-6", title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path d="M12 2 4 5v6c0 5.2 3.4 9.6 8 11 4.6-1.4 8-5.8 8-11V5l-8-3Z" fill="currentColor" />
      <path d="m8.3 12.2 2.6 2.6 4.9-5.3" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
