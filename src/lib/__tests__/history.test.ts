import { beforeEach, describe, expect, it, vi } from "vitest";
import { itemId, type PiiItem } from "@/lib/pii/types";

const fs = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn((_db: unknown, ...path: string[]) => ({ path: path.join("/") })),
  serverTimestamp: vi.fn(() => "SERVER_TIME"),
}));

vi.mock("firebase/firestore", () => ({
  ...fs,
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  writeBatch: vi.fn(),
  Timestamp: class {},
}));
vi.mock("@/lib/firebase", () => ({
  ensureSignedIn: vi.fn(async () => ({ uid: "anon-123" })),
  getDb: vi.fn(() => ({})),
}));

const { LeakError } = await import("@/lib/tasks/leak-error");
const { MAX_MASKED_INPUT_CHARS, computeStats, prepareHistoryRecord, saveResult } = await import("../history");

const item = (text: string, type: PiiItem["type"], enabled = true): PiiItem => ({
  id: itemId(text),
  text,
  type,
  enabled,
  origin: "ai",
});

const TEXT = "Leila Mansour (leila@example.com) signs on 10 January 2026 for Olive Data SARL.";
const ITEMS = [
  item("Leila Mansour", "PERSON"),
  item("leila@example.com", "EMAIL"),
  item("10 January 2026", "DATE", false), // the user showed dates to the AI
  item("Olive Data SARL", "OTHER"),
];
const RESULT = {
  text: "Leila Mansour will sign for Olive Data SARL on 10 January 2026.",
  source: "IN_CLOUD" as const,
  reason: "Long document (4,000 characters) → cloud",
};

beforeEach(() => {
  fs.addDoc.mockReset();
  fs.addDoc.mockResolvedValue({ id: "doc-1" });
});

describe("prepareHistoryRecord", () => {
  it("never contains any detected value, even items the user showed to the AI", () => {
    const record = prepareHistoryRecord(TEXT, ITEMS, "summarise", RESULT);
    const stored = JSON.stringify(record);
    for (const i of ITEMS) expect(stored).not.toContain(i.text);
    expect(record.maskedInput).toBe("[PERSON_1] ([EMAIL_1]) signs on [DATE_1] for [OTHER_1].");
  });

  it("uses the same placeholders in the input and the answer", () => {
    const record = prepareHistoryRecord(TEXT, ITEMS, "summarise", RESULT);
    expect(record.maskedOutput).toBe("[PERSON_1] will sign for [OTHER_1] on [DATE_1].");
  });

  it("refuses to build a record when the answer leaks new personal data", () => {
    const leaky = { ...RESULT, text: "Contact the signer at new.person@example.org." };
    expect(() => prepareHistoryRecord(TEXT, ITEMS, "summarise", leaky)).toThrow(LeakError);
  });

  it("masks a name part the AI used on its own (\"Ms Mansour\")", () => {
    const record = prepareHistoryRecord(TEXT, ITEMS, "summarise", { ...RESULT, text: "Ms Mansour will sign." });
    expect(record.maskedOutput).toMatch(/^Ms \[PERSON_\d+\] will sign\.$/);
  });

  it("refuses to store an answer where the AI reworded a date", () => {
    const reworded = { ...RESULT, text: "The contract was signed on Jan. 10, 2026." };
    expect(() => prepareHistoryRecord(TEXT, ITEMS, "summarise", reworded)).toThrow(LeakError);
  });

  it("counts the items that were protected during the task", () => {
    const record = prepareHistoryRecord(TEXT, ITEMS, "summarise", RESULT);
    expect(record.itemCounts).toEqual({ PERSON: 1, EMAIL: 1, OTHER: 1 });
  });

  it("keeps the source, reason and task", () => {
    expect(prepareHistoryRecord(TEXT, ITEMS, "translate", RESULT)).toMatchObject({
      task: "translate",
      source: "IN_CLOUD",
      reason: RESULT.reason,
    });
  });

  it("truncates the masked input to 20,000 characters", () => {
    const long = `${"Lorem ipsum dolor sit amet. ".repeat(1000)}Leila Mansour`;
    const record = prepareHistoryRecord(long, ITEMS, "summarise", { ...RESULT, text: "ok" });
    expect(record.maskedInput).toHaveLength(MAX_MASKED_INPUT_CHARS);
  });
});

describe("saveResult", () => {
  it("writes to users/<uid>/history with a server timestamp", async () => {
    const record = prepareHistoryRecord(TEXT, ITEMS, "summarise", RESULT);
    await expect(saveResult(record)).resolves.toBe("doc-1");
    expect(fs.collection).toHaveBeenCalledWith(expect.anything(), "users", "anon-123", "history");
    const [col, data] = fs.addDoc.mock.calls[0];
    expect(col).toEqual({ path: "users/anon-123/history" });
    expect(data).toEqual({ ...record, createdAt: "SERVER_TIME" });
  });

  it("never stores a placeholder map or unmasked text", async () => {
    await saveResult(prepareHistoryRecord(TEXT, ITEMS, "summarise", RESULT));
    const data = fs.addDoc.mock.calls[0][1];
    expect(Object.keys(data).sort()).toEqual(
      ["createdAt", "itemCounts", "maskedInput", "maskedOutput", "reason", "source", "task"].sort(),
    );
  });
});

describe("computeStats", () => {
  it("returns the total and the rounded on-device percentage", () => {
    const entries = [{ source: "ON_DEVICE" }, { source: "ON_DEVICE" }, { source: "IN_CLOUD" }] as const;
    expect(computeStats([...entries])).toEqual({ total: 3, onDevicePct: 67 });
  });

  it("handles no tasks", () => {
    expect(computeStats([])).toEqual({ total: 0, onDevicePct: 0 });
  });
});
