import type { ReactNode } from "react";

interface PagePlaceholderProps {
  title: string;
  intro: string;
  children?: ReactNode;
}

/** Temporary page shell used until each screen is built. */
export function PagePlaceholder({ title, intro, children }: PagePlaceholderProps) {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-2xl text-muted">{intro}</p>
      {children}
      <p className="inline-block rounded-md bg-accent-soft px-3 py-1 text-sm text-accent">
        Placeholder: coming in a later phase.
      </p>
    </section>
  );
}
