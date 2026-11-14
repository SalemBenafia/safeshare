# SafeShare: product and technical spec (v1)

## 1. Pitch
Use powerful cloud AI on your private documents, without sending your private data to the cloud.

## 2. Users
Job seekers (CVs), HR staff, small clinics, lawyers, NGOs and students: anyone who wants AI help with documents that contain personal data.

## 3. Main flow
1. **Input**: paste text, load a sample, or drop a JPEG/PNG photo of a document (read on-device only).
2. **Privacy scan** (on-device only): Gemini Nano returns a JSON list of personal items. A regex scanner also runs, and the results are merged.
3. **Review**: items are highlighted in the text, coloured by type. The user can switch any item off or on, switch a whole type with its group toggle (for example all dates), or select text to add an item.
4. **Mask**: each enabled item is replaced by a placeholder such as `[PERSON_1]`. The same value always gets the same placeholder. The map stays in memory only.
5. **Task**: Summarise | Rewrite (formal or simple) | Translate (English, French, Arabic) | Ask a question.
6. **Route**: the router picks the model (see section 6). `leakCheck()` runs before any model call.
7. **Unmask**: placeholders in the answer are replaced with the real values, on the device.
8. **Result**: the answer, a SourceBadge (On-device / Cloud) with the routing reason, and a Privacy report.

## 4. Screens (App Router)
- `/`: landing page with the pitch, a 3-step "how it works" diagram, the device status card and the CTAs "Open workspace" and "Try a sample".
- `/workspace`: the editor (Input -> Review -> Task -> Result) with a step indicator.
- `/history`: saved results (masked text only). Shown only if the user turned on "Save history".
- `/about`: how it works, what runs where, privacy promises, "Enable Gemini Nano in Chrome" and a diagnostics panel.
- `/playground`: development-only test page (hidden in production).

## 5. Modules (src/lib)
| File | Exports |
|---|---|
| `firebase.ts` | `getFirebaseApp()`, `getDb()`, `getAuthClient()` |
| `ai/models.ts` | `scanModel()`, `imageReadModel()`, `hybridModel()`, `cloudModel()` |
| `ai/device.ts` | `getDeviceStatus()`: returns `"available" \| "downloadable" \| "downloading" \| "unavailable" \| "unsupported"`; `prepareDeviceModel(onProgress)` |
| `ai/source.ts` | `toSource(inferenceSource)`: returns `"ON_DEVICE" \| "IN_CLOUD" \| "UNKNOWN"` |
| `pii/types.ts` | `PII_TYPES`, `PiiItem { id, text, type, enabled, origin: "ai" \| "regex" \| "user" }` |
| `pii/scan.ts` | `chunkText()`, `scanWithRegex()`, `scanWithAI()`, `mergeItems()`, `scanDocument()` |
| `pii/dates.ts` | Date formats, `isDateText()`, `hasBirthKeywordNearby()`, `classifyDate()` (`DATE_OF_BIRTH` or `DATE`) |
| `pii/clean.ts` | `cleanScanItems()`: trims items, drops role words and non-dates, fixes date and organisation types |
| `pii/mask.ts` | `mask(text, items)` returns `{ masked, map }`; `unmask(text, map)`; `leakCheck(masked, items)` |
| `tasks/prompts.ts` | `buildPrompt(task, maskedText, options)` |
| `tasks/router.ts` | `pickRoute(task, maskedText, settings, deviceStatus)` returns `{ target: "hybrid" \| "cloud", reason }` |
| `tasks/run.ts` | `runTask(...)`: streams the answer and returns `{ text, maskedText, source, reason, maskedChars }` |
| `settings.ts` | Remote Config defaults, `loadSettings()`, `getSettings()` |
| `history.ts` | `saveResult()`, `listResults()`, `deleteResult()`, `clearAll()` |

## 6. Routing rules (applied in order)
1. Privacy scan and image reading: `ONLY_ON_DEVICE`. If the device model is not available, use a regex-only scan and disable image input.
2. Translate into French or Arabic: cloud (`ONLY_IN_CLOUD`), masked text only.
3. Masked text longer than `device_max_chars`: cloud.
4. Device status is anything other than `"available"`: cloud, after the consent dialog (shown once per session).
5. Otherwise: hybrid (`PREFER_ON_DEVICE`).

Every result shows its reason, for example "Long document -> cloud" or "Short task -> on-device".

## 7. PII types
Every type below is personal data and is **masked by default** (items are found, highlighted and enabled). In Review, the user can switch single items off, or a whole type with its group toggle ("Dates (3): Hide all / Show all"), for example to let the AI calculate a duration.

| Type | What it covers | Example (invented) |
|---|---|---|
| `PERSON` | Names of people | Leila Mansour |
| `EMAIL` | Email addresses | leila@example.com |
| `PHONE` | Phone numbers, international or national | +216 22 333 444 |
| `ID_NUMBER` | National ID, passport, patient file and similar numbers | CIN 07654321 |
| `ADDRESS` | Home or postal addresses | 8 Rue Ibn Khaldoun, 3027 Sfax |
| `BANK` | IBANs and card numbers | TN59 0401 8104 0049 1234 5678 |
| `HEALTH` | Diagnoses, treatments, health details | type 2 diabetes |
| `DATE_OF_BIRTH` | A date with a birth keyword ("born", "date of birth", "DOB", "né le", "née le") within about 30 characters before it | born on 22 September 1988 |
| `DATE` | Any other full date: contract, appointment, admission, visit dates | 10 January 2026 |
| `OTHER` | Other identifying data, including company and organisation names | Olive Data SARL |

Date formats detected by both the AI scan and `scanWithRegex()`: "10 January 2026", "January 10, 2026", "10/01/2026", "2026-01-10", "10.01.2026" and French month names ("10 janvier 2026").

Not personal data, never items: plain years ("2026"), durations ("thirty days"), clause numbers ("1.2"), and role words (Client, Consultant, Party, Manager, Company, Agreement, Services, …). Items are trimmed of surrounding spaces and punctuation.

`leakCheck()` blocks a task only for **enabled** items still present in the text, and for new regex hits of type `EMAIL`, `PHONE`, `ID_NUMBER` or `BANK`. Items the user deliberately switched off (for example all dates) never block a task.

## 8. Data model (Firestore; only when "Save history" is ON, which is OFF by default)
`users/{uid}/history/{id}`: `{ createdAt, task, maskedInput (max 20,000 chars), maskedOutput, itemCounts: { [type]: number }, source, reason }`

Never stored: raw text, images, the placeholder map, or real values.

## 9. Remote Config parameters (with in-app defaults)
| Key | Type | Default |
|---|---|---|
| `cloud_model` | string | `gemini-3.5-flash-lite` |
| `device_max_chars` | number | `3000` |
| `scan_chunk_chars` | number | `1500` |
| `history_enabled` | boolean | `true` |

## 10. Privacy promises (shown in the UI and enforced in code)
- Your original text and images never leave this device.
- Cloud AI only sees placeholders such as `[PERSON_1]`.
- Real values are restored on your device and are never saved.

## 11. Acceptance criteria (end to end)
- With Gemini Nano: scanning the sample CV finds 8 or more items, the badge shows On-device, and scanning still works with the network set to Offline in DevTools.
- Long sample (longer than `device_max_chars`): the summary comes from the cloud, the DevTools Network tab shows only masked text in the request, and real names are restored in the result.
- In Firefox (no Gemini Nano): the regex fallback and its banner appear, cloud tasks run only after consent, and image input is disabled with an explanation.
- `npm run lint`, `npm run test` and `npm run build` all pass, and there are no secrets in the repo.
