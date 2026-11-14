import { describe, expect, it } from "vitest";
import { friendlyError } from "../errors";
import { LeakError } from "../leak-error";

/** Shaped like the SDK's AIError. */
function aiError(code: string, message: string, status?: number) {
  return Object.assign(new Error(`AI: ${message} (AI/${code})`), {
    code,
    customErrorData: status === undefined ? undefined : { status },
  });
}

describe("friendlyError", () => {
  it("explains a LeakError without values", () => {
    const err = new LeakError([{ text: "secret@example.com", type: "EMAIL", reason: "regex" }]);
    const f = friendlyError(err, true);
    expect(f.kind).toBe("leak");
    expect(f.message).toMatch(/Nothing was sent/);
    expect(f.message).not.toContain("secret@example.com");
  });

  it("explains a question leak, pointing back to the task", () => {
    const err = new LeakError(
      [
        { text: "Sophie Martin", type: "PERSON", reason: "item" },
        { text: "s@example.fr", type: "EMAIL", reason: "regex" },
      ],
      "question",
    );
    const f = friendlyError(err, true);
    expect(f).toMatchObject({ kind: "leak", back: "task", title: "Your question contains personal details" });
    expect(f.message).toContain("Names: 1, Emails: 1");
    expect(f.message).not.toContain("Sophie");
  });

  it("sends a document leak back to review", () => {
    expect(friendlyError(new LeakError([{ text: "x@example.com", type: "EMAIL", reason: "item" }]), true).back).toBe("review");
  });

  it("detects offline from the browser flag", () => {
    expect(friendlyError(new Error("anything"), false).kind).toBe("offline");
  });

  it("detects offline from a fetch failure without an HTTP status", () => {
    expect(friendlyError(aiError("fetch-error", "Failed to fetch"), true).kind).toBe("offline");
    expect(friendlyError(new TypeError("Failed to fetch"), true).kind).toBe("offline");
  });

  it.each([
    aiError("fetch-error", "Too many requests", 429),
    aiError("fetch-error", "RESOURCE_EXHAUSTED: quota exceeded", 400),
  ])("detects quota errors", (err) => {
    expect(friendlyError(err, true).kind).toBe("quota");
  });

  it.each([
    aiError("fetch-error", "Forbidden", 403),
    aiError("fetch-error", "Unauthorized", 401),
    Object.assign(new Error("AppCheck: attestation failed"), { code: "appCheck/fetch-status-error" }),
  ])("detects App Check errors", (err) => {
    expect(friendlyError(err, true).kind).toBe("appcheck");
  });

  it("detects setup problems", () => {
    expect(friendlyError(aiError("api-not-enabled", "API not enabled"), true).kind).toBe("setup");
    expect(friendlyError(aiError("fetch-error", "model not found", 404), true).kind).toBe("setup");
  });

  it("detects missing configuration", () => {
    const err = new Error("Firebase config is missing: apiKey. Fill in .env.local");
    expect(friendlyError(err, true).kind).toBe("config");
  });

  it("detects on-device unavailability", () => {
    // The SDK uses code "api-not-enabled" for this too; the message decides.
    const err = aiError("api-not-enabled", "Local LanguageModel API not available in this environment.");
    expect(friendlyError(err, true).kind).toBe("device");
    expect(friendlyError(new Error("on-device model failed"), true).kind).toBe("device");
  });

  it("falls back to a generic message", () => {
    const f = friendlyError("weird", true);
    expect(f.kind).toBe("unknown");
    expect(f.message).toMatch(/Nothing was saved/);
  });
});
