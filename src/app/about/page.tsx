import type { Metadata } from "next";
import { Diagnostics } from "@/components/Diagnostics";
import { ShieldIcon } from "@/components/ShieldIcon";
import { TYPE_STYLES } from "@/components/workspace/piiStyles";
import { TYPE_LABELS } from "@/lib/pii/labels";
import { PII_TYPES, type PiiType } from "@/lib/pii/types";

export const metadata: Metadata = { title: "About" };

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

const RUNS_WHERE: { step: string; where: string; place: "device" | "both" | "cloud" | "storage" }[] = [
  { step: "Reading a photo of a document", where: "On this device (Gemini Nano)", place: "device" },
  { step: "Finding personal data", where: "On this device (Gemini Nano + pattern scanner)", place: "device" },
  { step: "Replacing it with placeholders", where: "On this device", place: "device" },
  { step: "Leak check before any AI call", where: "On this device", place: "device" },
  { step: "The task (summary, rewrite, translation, question)", where: "On this device when possible, otherwise the cloud with masked text only", place: "both" },
  { step: "Putting real values back in the answer", where: "On this device", place: "device" },
  { step: "History (optional, off by default)", where: "Your private Firebase space, masked text only", place: "storage" },
];

const SECTIONS = [
  ["how-it-works", "How it works"],
  ["promises", "Privacy promises"],
  ["what-safeshare-hides", "What SafeShare hides"],
  ["enable-gemini-nano", "Enable Gemini Nano"],
  ["diagnostics", "Diagnostics"],
] as const;

function Where({ place, children }: { place: (typeof RUNS_WHERE)[number]["place"]; children: string }) {
  const tone =
    place === "device"
      ? "bg-device-soft text-device"
      : place === "cloud"
        ? "bg-cloud-soft text-cloud"
        : place === "both"
          ? "bg-canvas text-ink"
          : "bg-canvas text-muted";
  return <span className={`inline-block rounded-md px-2 py-0.5 text-sm font-medium ${tone}`}>{children}</span>;
}

export default function AboutPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">About SafeShare</h1>
        <p className="max-w-2xl text-lg text-muted">
          SafeShare lets you use cloud AI on private documents. Personal data is found and hidden on
          your device first, so the cloud only ever sees placeholders.
        </p>
        <nav aria-label="On this page">
          <ul className="flex flex-wrap gap-2 text-sm">
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="block rounded-full border border-line-strong px-3 py-1 text-ink hover:bg-surface">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <section id="how-it-works" aria-labelledby="how-it-works-title" className="scroll-mt-6 space-y-4 rounded-xl border border-line bg-surface p-6">
        <h2 id="how-it-works-title" className="text-2xl font-semibold tracking-tight">
          How it works: what runs where
        </h2>
        <p className="max-w-2xl text-muted">
          <span className="font-medium text-device">Green</span> means on this device.{" "}
          <span className="font-medium text-cloud">Blue</span> means the cloud. Every answer shows a
          badge with where it ran and why.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th scope="col" className="py-2 pr-4 font-medium">Step</th>
                <th scope="col" className="py-2 font-medium">Where it runs</th>
              </tr>
            </thead>
            <tbody>
              {RUNS_WHERE.map((row) => (
                <tr key={row.step} className="border-b border-line last:border-0">
                  <th scope="row" className="py-2.5 pr-4 font-normal">{row.step}</th>
                  <td className="py-2.5">
                    <Where place={row.place}>{row.where}</Where>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="max-w-2xl text-sm text-muted">
          Tasks go to the cloud when the document is long, when you translate into French or Arabic,
          or when on-device AI is not available. SafeShare asks before the first cloud call of a session
          and shows exactly what will be sent.
        </p>
      </section>

      <section id="promises" aria-labelledby="promises-title" className="scroll-mt-6 space-y-4 rounded-xl border border-line bg-surface p-6">
        <h2 id="promises-title" className="text-2xl font-semibold tracking-tight">
          Privacy promises
        </h2>
        <ul className="grid gap-3 md:grid-cols-3">
          {PROMISES.map((p) => (
            <li key={p} className="flex gap-3 rounded-lg border border-device/40 bg-device-soft p-4">
              <ShieldIcon className="mt-0.5 size-5 shrink-0 text-device" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </section>

      <section
        id="what-safeshare-hides"
        aria-labelledby="what-safeshare-hides-title"
        className="scroll-mt-6 space-y-4 rounded-xl border border-line bg-surface p-6"
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

      <section
        id="diagnostics"
        aria-labelledby="diagnostics-title"
        className="scroll-mt-6 space-y-4 rounded-xl border border-line bg-surface p-6"
      >
        <h2 id="diagnostics-title" className="text-2xl font-semibold tracking-tight">
          Diagnostics
        </h2>
        <p className="max-w-2xl text-sm text-muted">
          The active settings, whether on-device AI is ready, and where the last answer ran. No
          document text is shown here.
        </p>
        <Diagnostics />
      </section>
    </div>
  );
}
