import Link from "next/link";

const STEPS = [
  { title: "Scan on your device", text: "Gemini Nano finds names, numbers and other personal data.", tone: "device" },
  { title: "Mask", text: "Each item becomes a placeholder such as [PERSON_1].", tone: "device" },
  { title: "Ask the cloud", text: "Cloud AI only sees masked text. Real values are restored on your device.", tone: "cloud" },
] as const;

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="space-y-5">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Powerful cloud AI for your private documents.
        </h1>
        <p className="max-w-2xl text-lg text-muted">
          Without sending your private data to the cloud.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/workspace/"
            className="rounded-lg bg-device px-5 py-3 font-medium text-white hover:opacity-90"
          >
            Open workspace
          </Link>
          <Link
            href="/workspace/"
            className="rounded-lg border border-line bg-surface px-5 py-3 font-medium text-ink hover:bg-canvas"
          >
            Try a sample
          </Link>
        </div>
      </section>

      <section aria-labelledby="how" className="space-y-4">
        <h2 id="how" className="text-xl font-semibold">How it works</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-xl border border-line bg-surface p-5">
              <span
                className={`mb-3 inline-flex size-8 items-center justify-center rounded-full font-semibold ${
                  step.tone === "device" ? "bg-device-soft text-device" : "bg-cloud-soft text-cloud"
                }`}
              >
                {i + 1}
              </span>
              <h3 className="font-medium">{step.title}</h3>
              <p className="mt-1 text-sm text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-dashed border-line bg-surface p-5 text-sm text-muted">
        Device status card: placeholder.
      </section>
    </div>
  );
}
