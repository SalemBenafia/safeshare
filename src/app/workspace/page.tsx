import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const metadata: Metadata = { title: "Workspace · SafeShare" };

export default function WorkspacePage() {
  return (
    <PagePlaceholder
      title="Workspace"
      intro="Input → Review → Task → Result. Paste text or drop a photo; personal data is found and masked on your device."
    />
  );
}
