import type { Source } from "@/lib/ai/source";

interface SourceBadgeProps {
  source: Source;
  /** Optional routing reason, e.g. "Short task -> on-device". */
  reason?: string;
}

const VARIANTS: Record<Source, { label: string; explain: string; className: string }> = {
  ON_DEVICE: {
    label: "On-device",
    explain: "Ran on this device with Gemini Nano. Nothing left your computer.",
    className: "border-device/30 bg-device-soft text-device",
  },
  IN_CLOUD: {
    label: "Cloud",
    explain: "Ran in the cloud with Gemini. The cloud only receives the text that was sent.",
    className: "border-cloud/30 bg-cloud-soft text-cloud",
  },
  UNKNOWN: {
    label: "Unknown",
    explain: "The SDK did not report where this answer was generated.",
    className: "border-line bg-canvas text-muted",
  },
};

function Icon({ source }: { source: Source }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (source === "ON_DEVICE") {
    // Chip: computation on this device.
    return (
      <svg {...common}>
        <rect x="6" y="6" width="12" height="12" rx="2" />
        <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
      </svg>
    );
  }
  if (source === "IN_CLOUD") {
    return (
      <svg {...common}>
        <path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.6 1.5A4 4 0 0 0 6.5 19z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v.01M12 8a2 2 0 0 1 1 3.7c-.6.4-1 .9-1 1.6" />
    </svg>
  );
}

/** Shows where an AI result ran (from `response.inferenceSource`). */
export function SourceBadge({ source, reason }: SourceBadgeProps) {
  const v = VARIANTS[source];
  const tooltip = reason ? `${v.explain} Reason: ${reason}` : v.explain;
  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${v.className}`}
    >
      <Icon source={source} />
      {v.label}
      <span className="sr-only">. {tooltip}</span>
    </span>
  );
}
