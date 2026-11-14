import { InferenceSource } from "firebase/ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { itemId, type PiiItem } from "@/lib/pii/types";

const { hybridStream, cloudStream } = vi.hoisted(() => ({
  hybridStream: vi.fn(),
  cloudStream: vi.fn(),
}));

vi.mock("@/lib/ai/models", () => ({
  hybridModel: () => ({ generateContentStream: hybridStream }),
  cloudModel: () => ({ generateContentStream: cloudStream }),
}));

const { LeakError, runTask } = await import("../run");

/** Fakes a streamed answer from the SDK. */
function streamOf(chunks: string[], inferenceSource?: string) {
  async function* gen() {
    for (const c of chunks) yield { text: () => c };
  }
  return { stream: gen(), response: Promise.resolve({ inferenceSource }) };
}

const item = (text: string, type: PiiItem["type"], enabled = true): PiiItem => ({
  id: itemId(text),
  text,
  type,
  enabled,
  origin: "user",
});

const map = new Map([
  ["[PERSON_1]", "Ines Chaabane"],
  ["[EMAIL_1]", "ines@example.com"],
]);
const items = [item("Ines Chaabane", "PERSON"), item("ines@example.com", "EMAIL")];
const masked = "[PERSON_1] can be reached at [EMAIL_1].";
const hybrid = { target: "hybrid", reason: "Short task → on-device" } as const;
const cloud = { target: "cloud", reason: "Long document (4,000 characters) → cloud" } as const;

beforeEach(() => {
  hybridStream.mockReset();
  cloudStream.mockReset();
});

describe("runTask", () => {
  it("throws LeakError and calls no model when personal data is visible", async () => {
    const leaky = "[PERSON_1] can be reached at ines@example.com.";
    await expect(
      runTask({ task: "summarise", options: {}, maskedText: leaky, items, map, route: cloud }),
    ).rejects.toBeInstanceOf(LeakError);
    expect(hybridStream).not.toHaveBeenCalled();
    expect(cloudStream).not.toHaveBeenCalled();
  });

  it("blocks a question that contains an unmasked item", async () => {
    await expect(
      runTask({
        task: "ask",
        options: { question: "What is ines@example.com used for?" },
        maskedText: masked,
        items,
        map,
        route: hybrid,
      }),
    ).rejects.toBeInstanceOf(LeakError);
    expect(hybridStream).not.toHaveBeenCalled();
  });

  it("does not put personal values in the LeakError message", async () => {
    const err = await runTask({
      task: "summarise",
      options: {},
      maskedText: "Ines Chaabane",
      items,
      map,
      route: hybrid,
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LeakError);
    expect((err as Error).message).not.toContain("Ines");
  });

  it("uses the hybrid model for the hybrid route", async () => {
    hybridStream.mockResolvedValue(streamOf(["ok"], InferenceSource.ON_DEVICE));
    const res = await runTask({ task: "summarise", options: {}, maskedText: masked, items, map, route: hybrid });
    expect(hybridStream).toHaveBeenCalledOnce();
    expect(cloudStream).not.toHaveBeenCalled();
    expect(res.source).toBe("ON_DEVICE");
  });

  it("uses the cloud model for the cloud route and sends only masked text", async () => {
    cloudStream.mockResolvedValue(streamOf(["ok"], InferenceSource.IN_CLOUD));
    const res = await runTask({ task: "summarise", options: {}, maskedText: masked, items, map, route: cloud });
    expect(cloudStream).toHaveBeenCalledOnce();
    const sent = cloudStream.mock.calls[0][0] as string;
    expect(sent).toContain(masked);
    expect(sent).not.toContain("Ines Chaabane");
    expect(sent).not.toContain("ines@example.com");
    expect(res).toMatchObject({ source: "IN_CLOUD", reason: cloud.reason, maskedChars: sent.length });
  });

  it("restores a placeholder split across chunks, and never shows the fragment", async () => {
    hybridStream.mockResolvedValue(streamOf(["Hello [PER", "SON_1], your mail is [EM", "AIL_1]."]));
    const updates: string[] = [];
    const res = await runTask({
      task: "summarise",
      options: {},
      maskedText: masked,
      items,
      map,
      route: hybrid,
      onUpdate: (t) => updates.push(t),
    });
    expect(res.text).toBe("Hello Ines Chaabane, your mail is ines@example.com.");
    expect(res.maskedText).toBe("Hello [PERSON_1], your mail is [EMAIL_1].");
    expect(updates).toEqual([
      "Hello ",
      "Hello Ines Chaabane, your mail is ",
      "Hello Ines Chaabane, your mail is ines@example.com.",
    ]);
    expect(updates.some((u) => u.includes("[PER") || u.includes("[EM"))).toBe(false);
  });

  it("turns placeholders the model invented ([CLIENT]) into normal words", async () => {
    hybridStream.mockResolvedValue(streamOf(["[PERSON_1] ([CLI", "ENT]) pays the [CONSULTANT]."]));
    const updates: string[] = [];
    const res = await runTask({
      task: "summarise",
      options: {},
      maskedText: masked,
      items,
      map,
      route: hybrid,
      onUpdate: (t) => updates.push(t),
    });
    expect(res.text).toBe("Ines Chaabane (Client) pays the Consultant.");
    expect(updates.some((u) => u.includes("[CLI") || u.includes("[CLIENT]"))).toBe(false);
  });

  it("restores a placeholder that lost its brackets", async () => {
    hybridStream.mockResolvedValue(streamOf(["Dear PERSON_1."]));
    const res = await runTask({ task: "rewrite", options: { style: "formal" }, maskedText: masked, items, map, route: hybrid });
    expect(res.text).toBe("Dear Ines Chaabane.");
  });

  it("reports UNKNOWN when the SDK gives no inference source", async () => {
    hybridStream.mockResolvedValue(streamOf(["ok"]));
    const res = await runTask({ task: "summarise", options: {}, maskedText: masked, items, map, route: hybrid });
    expect(res.source).toBe("UNKNOWN");
  });

  it("ignores items the user chose not to mask", async () => {
    hybridStream.mockResolvedValue(streamOf(["ok"]));
    const visible = [item("Olive Data", "OTHER", false), ...items];
    await expect(
      runTask({ task: "summarise", options: {}, maskedText: `${masked} Olive Data`, items: visible, map, route: hybrid }),
    ).resolves.toMatchObject({ text: "ok" });
  });
});
