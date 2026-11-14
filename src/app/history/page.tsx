import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = { title: "History · SafeShare" };

export default function HistoryPage() {
  return (
    <PagePlaceholder
      title="History"
      intro="Saved results (masked text only). Shown only when you turn on “Save history”."
    />
  );
}
