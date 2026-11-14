import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = { title: "About · SafeShare" };

const PROMISES = [
  "Your original text and images never leave this device.",
  "Cloud AI only sees placeholders such as [PERSON_1].",
  "Real values are restored on your device and are never saved.",
];

export default function AboutPage() {
  return (
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
  );
}
