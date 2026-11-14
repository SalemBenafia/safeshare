"use client";

import { DeviceStatusCard } from "@/components/DeviceStatusCard";
import { InputStep } from "./InputStep";
import { ReviewStep } from "./ReviewStep";
import { StepIndicator } from "./StepIndicator";
import { useWorkspace } from "./WorkspaceProvider";

export function Workspace() {
  const { state } = useWorkspace();
  return (
    <div className="space-y-6">
      <h1 className="sr-only">Workspace</h1>
      <DeviceStatusCard />
      <StepIndicator />
      {state.step === 1 ? <InputStep /> : <ReviewStep />}
    </div>
  );
}
