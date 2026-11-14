"use client";

import { useEffect } from "react";
import { DeviceStatusCard } from "@/components/DeviceStatusCard";
import { findSample, sampleUrl } from "@/lib/samples";
import { ConsentDialog } from "./ConsentDialog";
import { InputStep } from "./InputStep";
import { ResultStep } from "./ResultStep";
import { ReviewStep } from "./ReviewStep";
import { StepIndicator } from "./StepIndicator";
import { TaskStep } from "./TaskStep";
import { UndoToast } from "./UndoToast";
import { useWorkspace } from "./WorkspaceProvider";

export function Workspace() {
  const { state, dispatch } = useWorkspace();

  // "Try a sample" on the landing page links to /workspace/?sample=cv.
  useEffect(() => {
    const sample = findSample(new URLSearchParams(window.location.search).get("sample"));
    if (!sample) return;
    window.history.replaceState(null, "", window.location.pathname);
    fetch(sampleUrl(sample.id))
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then(
        (text) => dispatch({ type: "SET_TEXT", text }),
        () => {
          // The empty state still offers the sample buttons.
        },
      );
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Workspace</h1>
      <DeviceStatusCard />
      <StepIndicator />
      {state.step === 1 && <InputStep />}
      {state.step === 2 && <ReviewStep />}
      {state.step === 3 && <TaskStep />}
      {state.step === 4 && <ResultStep />}
      {state.step === 2 && <UndoToast />}
      <ConsentDialog />
    </div>
  );
}
