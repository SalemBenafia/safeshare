// Built-in samples (invented data only), served from public/samples/.

export const SAMPLES = [
  { id: "cv", file: "sample-cv.txt", label: "CV (job seeker)", short: "CV" },
  { id: "letter", file: "sample-medical-letter.txt", label: "Medical letter", short: "Medical letter" },
  { id: "contract", file: "sample-long-contract.txt", label: "Long contract (4,000+ characters)", short: "Long contract" },
] as const;

export type SampleId = (typeof SAMPLES)[number]["id"];

export function findSample(id: string | null | undefined) {
  return SAMPLES.find((s) => s.id === id);
}

export function sampleUrl(id: SampleId): string {
  return `/samples/${findSample(id)!.file}`;
}
