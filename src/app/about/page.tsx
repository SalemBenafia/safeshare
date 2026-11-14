import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { TYPE_STYLES } from "@/components/workspace/piiStyles";
import { TYPE_LABELS } from "@/lib/pii/labels";
import { PII_TYPES, type PiiType } from "@/lib/pii/types";

export const metadata: Metadata = { title: "About · SafeShare" };

const TYPE_DESCRIPTIONS: Record<PiiType, string> = {
  PERSON: "Names of people, e.g. Leila Mansour.",
  EMAIL: "Email addresses, e.g. leila@example.com.",
  PHONE: "Phone numbers, e.g. +216 22 333 444.",
  ID_NUMBER: "ID, passport and file numbers, e.g. CIN 07654321.",
  ADDRESS: "Home and postal addresses, e.g. 8 Rue Ibn Khaldoun, Sfax.",
  BANK: "IBANs and card numbers.",
  HEALTH: "Diagnoses, treatments and other health details.",
  DATE_OF_BIRTH: "A date right after “born”, “date of birth”, “DOB” or “né(e) le”.",
  DATE: "Every other full date: contract, appointment, admission or visit dates.",
  OTHER: "Other identifying details, including company names such as Olive Data SARL.",
};

const PROMISES = [
  "Your original text and images never leave this device.",
  "Cloud AI only sees placeholders such as [PERSON_1].",
  "Real values are restored on your device and are never saved.",
];

function Code({ children }: { children: string }) {
  return (
    <code className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[0.9em] break-all select-all">
      {children}
    </code>
  );
}

export default function AboutPage() {
  return (
    <div className="space-y-12">
      <PagePlaceholder
        title="About"
        intro="How SafeShare works, what runs where, and how to enable Gemini Nano in Chrome."
      >
        <ul className="max-w-2xl space-y-2">
          {PROMISES.map((p) => (
            <li key={p} className="rounded-lg border border-line bg-surface px-4 py-3">
              {p}
            </li>
          ))}
        </ul>
      </PagePlaceholder>

      <section
        id="what-safeshare-hides"
        aria-labelledby="what-safeshare-hides-title"
        className="space-y-4 rounded-xl border border-line bg-surface p-6"
      >
        <h2 id="what-safeshare-hides-title" className="text-2xl font-semibold tracking-tight">
          What SafeShare hides
        </h2>
        <p className="max-w-2xl text-muted">
          Everything below is treated as personal data and is hidden by default. Each item is
          replaced by a placeholder such as <Code>[PERSON_1]</Code> before any cloud AI sees the text.
        </p>
        <dl className="grid max-w-3xl gap-x-6 gap-y-3 sm:grid-cols-2">
          {PII_TYPES.map((type) => (
            <div key={type} className="flex gap-3">
              <span aria-hidden="true" className={`mt-1.5 size-2.5 shrink-0 rounded-full ${TYPE_STYLES[type].chip}`} />
              <div>
                <dt className="font-medium">{TYPE_LABELS[type]}</dt>
                <dd className="text-sm text-muted">{TYPE_DESCRIPTIONS[type]}</dd>
              </div>
            </div>
          ))}
        </dl>
        <div className="max-w-2xl space-y-2 text-sm text-muted">
          <p>
            <strong className="text-ink">Dates are hidden too.</strong> If the AI needs them, for
            example to work out how long a contract lasts, use <strong className="text-ink">Show all</strong>{" "}
            next to “Dates” in the Review step to share every date in one click. Dates of birth
            stay a separate group.
          </p>
          <p>
            <strong className="text-ink">Never hidden:</strong> plain years (“2026”), durations
            (“thirty days”), clause numbers (“1.2”) and role words such as Client, Consultant or
            Party, so the AI can still follow the document.
          </p>
        </div>
      </section>

      <section
        id="enable-gemini-nano"
        aria-labelledby="enable-gemini-nano-title"
        className="scroll-mt-6 space-y-4 rounded-xl border border-line bg-surface p-6"
      >
        <h2 id="enable-gemini-nano-title" className="text-2xl font-semibold tracking-tight">
          Enable Gemini Nano in Chrome
        </h2>
        <p className="max-w-2xl text-muted">
          SafeShare finds personal data with Gemini Nano, the AI model built into Chrome. It
          runs on your computer, so your document is never uploaded for scanning.
        </p>
        <ol className="max-w-2xl list-decimal space-y-3 pl-5">
          <li>
            Use <strong>desktop Chrome 139 or newer</strong> (Windows, macOS, Linux or
            ChromeOS on a Chromebook Plus). Check your version at <Code>chrome://settings/help</Code>.
          </li>
          <li>
            Copy <Code>chrome://flags/#prompt-api-for-gemini-nano-multimodal-input</Code> into
            the address bar, set it to <strong>Enabled</strong>, then relaunch Chrome.
          </li>
          <li>
            Check your hardware:
            <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
              <li>At least 22 GB of free disk space.</li>
              <li>A GPU with more than 4 GB of VRAM, or 16 GB of RAM and 4 or more CPU cores.</li>
            </ul>
          </li>
          <li>
            Open <Code>chrome://on-device-internals</Code> to see whether the model is
            downloaded and ready.
          </li>
          <li>
            Come back to SafeShare and click <strong>Download the private AI model</strong>.
            The download happens once; after that, scanning works offline.
          </li>
        </ol>
        <p className="max-w-2xl text-sm text-muted">
          Chrome blocks links to <Code>chrome://</Code> pages, so copy and paste them.
        </p>
      </section>
    </div>
  );
}
