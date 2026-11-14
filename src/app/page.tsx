import Link from "next/link";
import { DeviceStatusCard } from "@/components/DeviceStatusCard";
import { PlaceholderText } from "@/components/PlaceholderText";
import { ShieldIcon } from "@/components/ShieldIcon";

const NEVER_LEAVES = [
  { title: "Your original text and photos", text: "Documents are read and scanned inside Chrome, on this computer." },
  { title: "Names, numbers and dates", text: "Every personal detail is swapped for a placeholder before any cloud call." },
  { title: "The placeholder key", text: "The list linking [PERSON_1] to a real name lives in memory only and is never saved or sent." },
  { title: "The final answer with real names", text: "Real values are put back on your screen, after the cloud has replied." },
];

function ChipIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
    </svg>
  );
}

function BracketsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 4H5v16h3M16 4h3v16h-3M9.5 12h5" />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.6 1.5A4 4 0 0 0 6.5 19z" />
    </svg>
  );
}

function Arrow() {
  return (
    <li aria-hidden="true" className="flex items-center justify-center text-line-strong">
      <svg viewBox="0 0 24 24" className="size-6 rotate-90 md:rotate-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </li>
  );
}

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="space-y-6 pt-4">
        <p className="inline-flex items-center gap-2 rounded-full bg-device-soft px-3 py-1 text-sm font-medium text-device">
          <ShieldIcon className="size-4" />
          Private by design · Gemini Nano + Gemini
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Use powerful cloud AI on private documents.
        </h1>
        <p className="max-w-2xl text-lg text-muted">
          Personal data is found and hidden on your device, so the cloud only ever sees placeholders.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/workspace/"
            className="rounded-lg bg-device-fill px-5 py-3 font-medium text-white shadow-sm hover:opacity-90"
          >
            Open workspace
          </Link>
          <Link
            href="/workspace/?sample=cv"
            className="rounded-lg border border-line-strong bg-surface px-5 py-3 font-medium text-ink hover:bg-canvas"
          >
            Try a sample
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section aria-labelledby="how" className="space-y-5">
        <h2 id="how" className="text-2xl font-semibold tracking-tight">
          How it works
        </h2>
        <ol className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
          <li className="rounded-xl border border-device/40 bg-device-soft p-5">
            <div className="flex items-center gap-2 text-device">
              <ChipIcon />
              <span className="text-sm font-semibold uppercase tracking-wide">Step 1 · On your device</span>
            </div>
            <h3 className="mt-3 text-lg font-semibold">On-device scan</h3>
            <p className="mt-1 text-sm text-muted">
              Gemini Nano, built into Chrome, finds names, numbers, addresses and dates.
            </p>
          </li>
          <Arrow />
          <li className="rounded-xl border border-line bg-surface p-5">
            <div className="flex items-center gap-2 text-ink">
              <BracketsIcon />
              <span className="text-sm font-semibold uppercase tracking-wide">Step 2 · Masked text</span>
            </div>
            <h3 className="mt-3 text-lg font-semibold">Placeholders only</h3>
            <p className="mt-1 font-mono text-sm text-muted">
              <PlaceholderText text="Dear [PERSON_1], your visit on [DATE_1]…" />
            </p>
          </li>
          <Arrow />
          <li className="rounded-xl border border-cloud/40 bg-cloud-soft p-5">
            <div className="flex items-center gap-2 text-cloud">
              <CloudIcon />
              <span className="text-sm font-semibold uppercase tracking-wide">Step 3 · In the cloud</span>
            </div>
            <h3 className="mt-3 text-lg font-semibold">Cloud AI</h3>
            <p className="mt-1 text-sm text-muted">
              Gemini summarises, rewrites or translates the masked text. Real values come back on your device.
            </p>
          </li>
        </ol>
      </section>

      {/* Device */}
      <section aria-labelledby="device" className="space-y-3">
        <h2 id="device" className="text-2xl font-semibold tracking-tight">
          This device
        </h2>
        <DeviceStatusCard />
      </section>

      {/* Trust */}
      <section id="never-leaves" aria-labelledby="never-leaves-title" className="scroll-mt-6 space-y-5">
        <h2 id="never-leaves-title" className="text-2xl font-semibold tracking-tight">
          What never leaves your device
        </h2>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
          <ul className="grid gap-3 sm:grid-cols-2">
            {NEVER_LEAVES.map((item) => (
              <li key={item.title} className="flex gap-3 rounded-xl border border-line bg-surface p-4">
                <ShieldIcon className="mt-0.5 size-5 shrink-0 text-device" />
                <div>
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="mt-0.5 text-sm text-muted">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <figure className="rounded-xl border border-cloud/40 bg-surface p-5">
            <figcaption className="flex items-center gap-2 text-sm font-semibold text-cloud">
              <CloudIcon />
              What the cloud sees
            </figcaption>
            <p className="mt-3 rounded-lg bg-canvas p-4 font-mono text-sm leading-6">
              <PlaceholderText text="[PERSON_1] ([EMAIL_1]) signs with [OTHER_1] on [DATE_1]. Fee paid to [BANK_1]." />
            </p>
            <p className="mt-3 text-sm text-muted">
              Before anything is sent, a leak check blocks the request if personal data is still visible.
            </p>
          </figure>
        </div>
      </section>
    </div>
  );
}
