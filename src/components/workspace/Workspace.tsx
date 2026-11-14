"use client";

import { DeviceStatusCard } from "@/components/DeviceStatusCard";
import { ConsentDialog } from "./ConsentDialog";
import { InputStep } from "./InputStep";
import { ResultStep } from "./ResultStep";
import { ReviewStep } from "./ReviewStep";
import { StepIndicator } from "./StepIndicator";
import { TaskStep } from "./TaskStep";
import { useWorkspace } from "./WorkspaceProvider";

export function Workspace() {
  const { state } = useWorkspace();
  return (
    <div className="space-y-6">
      <h1 className="sr-only">Workspace</h1>
      <DeviceStatusCard />
      <StepIndicator />
      {state.step === 1 && <InputStep />}
      {state.step === 2 && <ReviewStep />}
      {state.step === 3 && <TaskStep />}
      {state.step === 4 && <ResultStep />}
      <ConsentDialog />
    </div>
  );
}
