import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getGenerativeModel: vi.fn((_ai: unknown, params: unknown) => ({ params })),
  settings: { cloud_model: "gemini-a" },
}));

vi.mock("firebase/ai", async (orig) => ({
  ...(await orig<typeof import("firebase/ai")>()),
  getAI: vi.fn(() => ({})),
  getGenerativeModel: mocks.getGenerativeModel,
}));
vi.mock("@/lib/firebase", () => ({ getFirebaseApp: vi.fn(() => ({})) }));
vi.mock("@/lib/settings", () => ({ getSettings: () => mocks.settings }));

const { InferenceMode } = await import("firebase/ai");
const { cloudModel, hybridModel, imageReadModel, scanModel } = await import("../models");

type Params = { mode: string; inCloudParams?: { model: string }; onDeviceParams?: unknown };
const paramsOf = (m: unknown) => (m as { params: Params }).params;

beforeEach(() => {
  mocks.settings.cloud_model = "gemini-a";
});

describe("task models follow Remote Config cloud_model", () => {
  it("uses the setting as inCloudParams.model", () => {
    expect(paramsOf(hybridModel())).toMatchObject({ mode: InferenceMode.PREFER_ON_DEVICE, inCloudParams: { model: "gemini-a" } });
    expect(paramsOf(cloudModel())).toMatchObject({ mode: InferenceMode.ONLY_IN_CLOUD, inCloudParams: { model: "gemini-a" } });
  });

  it("reuses the same model while the setting is unchanged", () => {
    expect(hybridModel()).toBe(hybridModel());
    expect(cloudModel()).toBe(cloudModel());
  });

  it("recreates the models when cloud_model changes", () => {
    const before = [hybridModel(), cloudModel()];
    mocks.settings.cloud_model = "gemini-b";
    const after = [hybridModel(), cloudModel()];
    expect(after[0]).not.toBe(before[0]);
    expect(after[1]).not.toBe(before[1]);
    expect(paramsOf(after[0]).inCloudParams?.model).toBe("gemini-b");
    expect(paramsOf(after[1]).inCloudParams?.model).toBe("gemini-b");
  });
});

describe("on-device models never use the cloud", () => {
  it.each([
    ["scanModel", scanModel],
    ["imageReadModel", imageReadModel],
  ])("%s is ONLY_ON_DEVICE with no cloud params", (_name, factory) => {
    const p = paramsOf(factory());
    expect(p.mode).toBe(InferenceMode.ONLY_ON_DEVICE);
    expect(p.inCloudParams).toBeUndefined();
  });
});
