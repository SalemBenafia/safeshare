import { ImageResponse } from "next/og";

// Rendered to a PNG at build time (static export requires force-static).
export const dynamic = "force-static";
export const alt = "SafeShare: use cloud AI on private documents, with personal data hidden on your device";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const chip = (bg: string, fg: string, label: string) => (
  <div style={{ display: "flex", padding: "14px 26px", borderRadius: 999, background: bg, color: fg, fontSize: 30, fontWeight: 600 }}>
    {label}
  </div>
);

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 88px",
          background: "#0d1117",
          color: "#e6edf3",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <svg width="120" height="120" viewBox="0 0 24 24">
            <path d="M12 2 4 5v6c0 5.2 3.4 9.6 8 11 4.6-1.4 8-5.8 8-11V5l-8-3Z" fill="#12805c" />
            <path d="m8.3 12.2 2.6 2.6 4.9-5.3" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ display: "flex", fontSize: 88, fontWeight: 700, letterSpacing: -2 }}>
            Safe<span style={{ color: "#4cc38a" }}>Share</span>
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 36, fontSize: 46, fontWeight: 600, lineHeight: 1.2, maxWidth: 1000 }}>
          Use powerful cloud AI on private documents.
        </div>
        <div style={{ display: "flex", marginTop: 16, fontSize: 32, color: "#9aa6b2", maxWidth: 1000 }}>
          Personal data is hidden on your device. The cloud only sees placeholders.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 52 }}>
          {chip("#0f2e22", "#4cc38a", "On-device scan")}
          <div style={{ display: "flex", fontSize: 36, color: "#6b7684" }}>→</div>
          {chip("#2a323c", "#e6edf3", "[PERSON_1]")}
          <div style={{ display: "flex", fontSize: 36, color: "#6b7684" }}>→</div>
          {chip("#142540", "#7aa7ff", "Cloud AI")}
        </div>
      </div>
    ),
    size,
  );
}
