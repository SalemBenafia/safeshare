import type { Metadata } from "next";
import { Playground } from "@/components/dev/Playground";

export const metadata: Metadata = {
  title: "Playground · SafeShare",
  robots: { index: false, follow: false },
};

/** Development-only test page. Production builds render only "Not available". */
export default function PlaygroundPage() {
  if (process.env.NODE_ENV !== "development") {
    return <p className="text-muted">Not available</p>;
  }
  return <Playground />;
}
