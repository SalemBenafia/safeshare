import type { PiiOrigin, PiiType } from "./types";

/** Human-readable group names for each PII type. */
export const TYPE_LABELS: Record<PiiType, string> = {
  PERSON: "Names",
  EMAIL: "Emails",
  PHONE: "Phone numbers",
  ID_NUMBER: "ID numbers",
  ADDRESS: "Addresses",
  BANK: "Bank and card",
  HEALTH: "Health",
  DATE_OF_BIRTH: "Dates of birth",
  DATE: "Dates",
  OTHER: "Other",
};

export const ORIGIN_LABELS: Record<PiiOrigin, string> = {
  ai: "AI",
  regex: "Pattern",
  user: "You",
};
