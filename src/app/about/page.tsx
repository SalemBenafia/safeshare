import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = { title: "About · SafeShare" };

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
