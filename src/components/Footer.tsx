import Link from "next/link";
import { ShieldIcon } from "@/components/ShieldIcon";

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-center gap-2">
          <ShieldIcon className="size-4 text-device" />
          Your original text never leaves this device. Cloud AI only sees placeholders.
        </p>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            <li>
              <Link href="/about/" className="rounded hover:text-ink">How it works</Link>
            </li>
            <li>
              <Link href="/#never-leaves" className="rounded hover:text-ink">What never leaves your device</Link>
            </li>
            <li>
              <Link href="/about/#diagnostics" className="rounded hover:text-ink">Diagnostics</Link>
            </li>
            <li>Apache-2.0 · #BuildHybridAI 2026</li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
