import { describe, expect, it } from "vitest";
import { mask } from "@/lib/pii/mask";
import { itemId, type PiiItem } from "@/lib/pii/types";
import { checkQuestion } from "../question";

const item = (text: string, type: PiiItem["type"], enabled = true): PiiItem => ({
  id: itemId(text),
  text,
  type,
  enabled,
  origin: "ai",
});

const DOC = "I am writing about my patient Julien Moreau. Mr Moreau has type 2 diabetes.";
const { map } = mask(DOC, [item("Julien Moreau", "PERSON"), item("type 2 diabetes", "HEALTH")]);

describe("checkQuestion", () => {
  it("masks names from the document in any case, including name parts", () => {
    const res = checkQuestion("Does julien moreau still see Dr X? Is MOREAU better?", map, [
      item("julien moreau", "PERSON"),
    ]);
    expect(res.masked).toBe("Does [PERSON_1] still see Dr X? Is [PERSON_2] better?");
    expect(res.report.ok).toBe(true);
  });

  it("masks known health details too", () => {
    expect(checkQuestion("How is his Type 2 Diabetes treated?", map, []).masked).toBe("How is his [HEALTH_1] treated?");
  });

  it("blocks personal data found only in the question", () => {
    const res = checkQuestion("Is Sophie Martin his partner? Email sophie@example.fr", map, [
      item("Sophie Martin", "PERSON"),
      item("sophie@example.fr", "EMAIL"),
    ]);
    expect(res.report.ok).toBe(false);
    expect(res.report.leaks.map((l) => l.type).sort()).toEqual(["EMAIL", "PERSON"]);
  });

  it("blocks an email in the question even if the scan missed it", () => {
    expect(checkQuestion("Write to new.contact@example.org", map, []).report.ok).toBe(false);
  });

  it("passes a question with no personal data", () => {
    expect(checkQuestion("  What is the main diagnosis?  ", map, [])).toEqual({
      masked: "What is the main diagnosis?",
      report: { ok: true, leaks: [] },
    });
  });
});
