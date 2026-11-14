import type { Metadata } from "next";
import { Workspace } from "@/components/workspace/Workspace";
import { WorkspaceProvider } from "@/components/workspace/WorkspaceProvider";

export const metadata: Metadata = { title: "Workspace · SafeShare" };

export default function WorkspacePage() {
  return (
    <WorkspaceProvider>
      <Workspace />
    </WorkspaceProvider>
  );
}
