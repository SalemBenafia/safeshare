# SafeShare: Claude Code prompts, in order

How to use these prompts:
- Run `/clear` before each new phase, so Claude starts with a clean context.
- For big phases, start in plan mode. In the VS Code extension, type `/plan` followed by the prompt. In the terminal, press `Shift+Tab` until you see "plan mode on". Read the plan, then approve it.
- After each phase, test by hand (see the CHECK list in the manual), then use the commit prompt.

<!-- id:P0a -->
### P0a · Understand the project (plan mode, no code)
```text
Read CLAUDE.md and docs/SPEC.md. Do not write or change any code yet.
1. Explain back to me, in about 10 bullet points, what SafeShare does and exactly which data goes on-device and which goes to the cloud.
2. List anything in the spec that is unclear, risky or contradictory, with your suggested decision for each.
3. Inspect the project as created by create-next-app (package.json scripts, tsconfig, ESLint, Tailwind, next.config). Tell me what is missing for our rules, for example a "test" script or static export.
```

<!-- id:P0b -->
### P0b · Project skeleton
```text
Set up the project skeleton for SafeShare, following CLAUDE.md and docs/SPEC.md.
- next.config.ts: static export (output: "export", images: { unoptimized: true }, trailingSlash: true).
- Add Vitest as a dev dependency with a "test": "vitest run" script and one smoke test in src/lib/__tests__/smoke.test.ts.
- Create the module files from SPEC section 5 as typed stubs (functions may throw new Error("Not implemented")).
- Create the routes /, /workspace, /history and /about with a shared header (text logo "SafeShare" and nav links) and a footer. Placeholder content only.
- Root layout: Inter via next/font, a calm and trustworthy look. Define theme colours: device green #12805c, cloud blue #1f5fd1, accent orange #e8710a.
- Check that .env.example lists every NEXT_PUBLIC_* variable we use, and that .gitignore ignores .env* files except .env.example.
- In package.json set "license": "Apache-2.0".
Then run npm run lint, npm run test and npm run build, fix any problems, and show me the results.
```

<!-- id:P1 -->
### P1 · Firebase, App Check and the first hybrid call
```text
Implement Firebase initialisation and the first hybrid AI call.
1. src/lib/firebase.ts: a lazy, browser-only getFirebaseApp() using the NEXT_PUBLIC_* env vars. Initialise App Check once with new ReCaptchaEnterpriseProvider(process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY) and isTokenAutoRefreshEnabled: true. In development only (process.env.NODE_ENV === "development"), set self.FIREBASE_APPCHECK_DEBUG_TOKEN = true BEFORE initializeAppCheck, and add a global TypeScript declaration for it.
2. src/lib/ai/models.ts: lazy singletons using getAI(app, { backend: new GoogleAIBackend() }):
   - hybridModel(): InferenceMode.PREFER_ON_DEVICE, with inCloudParams.model = "gemini-3.5-flash-lite" for now
   - cloudModel(): InferenceMode.ONLY_IN_CLOUD, same cloud model
   (scanModel and imageReadModel come later.)
3. src/lib/ai/source.ts: toSource(value) maps response.inferenceSource to "ON_DEVICE" | "IN_CLOUD" | "UNKNOWN". Add Vitest tests.
4. src/components/SourceBadge.tsx: a green "On-device" or blue "Cloud" pill with an icon and a tooltip that explains what it means.
5. A development-only page /playground: a "Prepare on-device AI" button (calls initializeDeviceModel and shows a progress bar), a textarea, "Ask (prefer device)" and "Ask (cloud only)" buttons, a streamed answer using generateContentStream, and the SourceBadge (read inferenceSource from the final aggregated response). In production builds the page must render only "Not available".
If you are unsure about any Firebase AI Logic API, use the Firebase AI Logic skill or read https://firebase.google.com/docs/ai-logic/hybrid/web/get-started before writing code.
Run lint, test and build, and fix any issues. Then tell me exactly how to test it in Chrome.
```

<!-- id:P2 -->
### P2 · Device status and model download onboarding
```text
Build device detection and the on-device model onboarding.
1. src/lib/ai/device.ts:
   - getDeviceStatus(): if Chrome's Prompt API global LanguageModel does not exist, return "unsupported"; otherwise return await LanguageModel.availability(...), passing the same expected inputs/outputs we use for our models. Add a minimal type declaration in src/types/language-model.d.ts. This is for showing status in the UI ONLY. Never use LanguageModel for inference.
   - prepareDeviceModel(onProgress): calls hybridModel().initializeDeviceModel(onProgress). It must be called from a click handler.
2. src/hooks/useDeviceStatus.ts: a React hook that checks the status on mount and again after a download finishes.
3. src/components/DeviceStatusCard.tsx with clear states:
   - available: green, "Private AI is ready on this device"
   - downloadable: button "Download the private AI model (one time, a few GB)"
   - downloading: progress bar with a percentage
   - unavailable / unsupported: amber card: "This browser can't run on-device AI. SafeShare still protects you with a basic scanner and always asks before using the cloud." plus a link to /about#enable-gemini-nano
4. Show the card on the landing page and at the top of /workspace.
5. On /about, add a section with id "enable-gemini-nano": desktop Chrome 139 or newer, the flag chrome://flags/#prompt-api-for-gemini-nano-multimodal-input, hardware needs (22 GB free disk; GPU with more than 4 GB VRAM, or 16 GB RAM and 4+ CPU cores), and chrome://on-device-internals to check the model.
Run lint, test and build, and fix issues.
```

<!-- id:P3 -->
### P3 · Privacy scan engine (logic and tests first)
```text
Implement the privacy scan engine in src/lib/pii/. Write the Vitest tests first, then the code.
1. types.ts: PII_TYPES from SPEC section 7, and PiiItem { id, text, type, enabled, origin: "ai" | "regex" | "user" }.
2. scan.ts:
   - chunkText(text, maxChars): split on paragraph or sentence boundaries, never in the middle of a word.
   - scanWithRegex(text): emails, phone numbers (international formats, including +216 numbers), IBAN-like numbers, card-like numbers, and dates near words like "born", "DOB" or "date of birth". Keep patterns conservative to avoid false positives.
   - scanModel() in ai/models.ts: InferenceMode.ONLY_ON_DEVICE with structured output. The schema is Schema.object with items: Schema.array of Schema.object { text: Schema.string(), type: Schema.enumString({ enum: [...PII_TYPES] }) }, passed as onDeviceParams.promptOptions.responseConstraint.
   - scanWithAI(text, chunkChars): scan chunk by chunk with a clear prompt ("list every piece of personal data; copy each item exactly as written"). Parse the JSON safely, retrying once if it is invalid. DROP any item whose text does not appear exactly in the source text (hallucination guard).
   - mergeItems(...lists): dedupe by exact text, prefer the more specific type, keep stable ids.
   - scanDocument(text, deviceStatus, settings): AI + regex when the device model is available; regex only otherwise. Returns { items, usedAI }.
3. mask.ts:
   - mask(text, items): only enabled items, longest text first, placeholders like [PERSON_1]; the same value always gets the same placeholder. Returns { masked, map }.
   - unmask(text, map): restores values. Also accept a placeholder that lost its brackets (PERSON_1), but only as an exact whole-word match.
   - leakCheck(masked, items): returns every enabled item text, or new regex hit, still present in the masked text.
4. Fixtures in src/lib/pii/__fixtures__/: a fake CV and a fake medical letter with invented Tunisian, French and English names and fake numbers.
Tests must cover: overlapping items ("Ahmed" inside "Ahmed Ben Ali"), repeated values, disabled items, the mask/unmask round trip, leakCheck catching a missed email, chunk boundaries, and hallucinated AI items being dropped (mock the model).
Run npm run test until everything passes, then lint and build.
```

<!-- id:P4 -->
### P4 · Workspace: Input, Scan and Review
```text
Build the /workspace screen for steps 1 to 3 of SPEC section 3 (Input -> Scan -> Review). No AI tasks yet.
- A step indicator at the top: 1 Input, 2 Review, 3 Task, 4 Result.
- Input: a large textarea with a character count, and a "Load sample" menu that reads files from public/samples/. Create sample-cv.txt, sample-medical-letter.txt and sample-long-contract.txt (more than 4,000 characters), all with invented data.
- A "Scan for personal data" button that calls scanDocument(). While scanning, show "Scanning on your device...". When done, show e.g. "Found 12 items. Scanned on-device. Nothing left your computer." (or "basic scanner" when it was regex only).
- Review: the text with highlights coloured by type; a side list grouped by type with a toggle for each item; "Add item" by selecting text in the preview; and a "Masked preview" tab showing exactly what a cloud model would see.
- Keep state in a React reducer plus context (no new state library).
- Accessibility: keyboard navigation, aria labels, good contrast. It must look right at 1280 px and 1440 px wide.
Run lint, test and build. Then tell me how to test it by hand.
```

<!-- id:P5 -->
### P5 · Tasks, router, consent and result
```text
Implement steps 3 and 4: tasks, routing, cloud consent and the result view.
1. src/lib/tasks/prompts.ts: prompts for summarize, rewrite (formal | simple), translate (English | French | Arabic) and ask (a question). Every prompt must include: "Keep placeholders like [PERSON_1] exactly as they are."
2. src/lib/tasks/router.ts: pickRoute(task, maskedText, settings, deviceStatus), implementing SPEC section 6 exactly. It returns { target: "hybrid" | "cloud", reason }. Write Vitest tests for every rule.
3. src/lib/tasks/run.ts: runTask() first calls leakCheck(). If anything leaks, throw a LeakError and call no model at all. Otherwise stream with generateContentStream from hybridModel() or cloudModel(). Accumulate the streamed text and show unmask(accumulated) on each update (a placeholder can be split across chunks). Finish with { text, maskedText, source, reason, maskedChars }.
4. ConsentDialog: before the FIRST cloud call in a session, show exactly what will be sent (a masked text preview and its character count) with the buttons "Send masked text to cloud" and "Cancel". Remember the choice for this session only.
5. Result view: the streamed answer (use dir="auto" so Arabic displays correctly), the SourceBadge and the reason, "Copy" and "Download .txt" buttons, and a Privacy report card: items protected by type, where each step ran, characters sent to the cloud, and "0 personal items sent".
6. Friendly error messages for offline, quota, App Check errors and LeakError.
Run lint, test and build, and fix issues.
```

<!-- id:P6 -->
### P6 · Image input (on-device only)
```text
Add image input (a photo or screenshot of a document). Images are read on-device only.
- In the Input step, accept drag and drop or a file picker for JPEG and PNG only, with a 5 MB maximum. Reject other types with a clear message.
- imageReadModel() in ai/models.ts: InferenceMode.ONLY_ON_DEVICE. Configure onDeviceParams.createOptions so that image input is allowed, as the Prompt API requires (check the Firebase hybrid web docs and the Chrome Prompt API docs). Prompt: "Transcribe all the text in this image exactly. Output only the text."
- Convert the file to an inline-data part (base64 + mimeType), following the multimodal example in the Firebase hybrid web docs.
- The transcribed text goes into the normal flow (scan -> review -> task). The image is never uploaded and is released from memory after reading.
- If the device model is not "available", disable image input with this message: "Reading images needs on-device AI, so your document photo never leaves your computer."
Run lint, test and build.
```

<!-- id:P7 -->
### P7 · Anonymous Auth and optional history
```text
Add optional history with Firebase Auth (anonymous) and Firestore.
- getAuthClient(): sign in anonymously the first time it is needed. getDb(): Firestore.
- A setting "Save history (masked text only)". It is OFF by default and stored in localStorage (wrap reads and writes in try/catch).
- src/lib/history.ts: saveResult, listResults, deleteResult and clearAll for users/{uid}/history, following SPEC section 8. Save the MASKED input and the MASKED answer (placeholders, before unmasking), never the unmasked text or the placeholder map. Run leakCheck before saving and refuse to save if anything leaks.
- /history page: a list (date, task, SourceBadge, item counts), a view of the masked text, delete one, and delete all. Add a stats line: "X tasks, Y% on-device".
- firestore.rules: only the signed-in owner can read or write users/{uid}/**; deny everything else. Create firebase.json and firestore.indexes.json if they are missing, pointing to firestore.rules.
Run lint, test and build.
```

<!-- id:P8 -->
### P8 · Remote Config
```text
Add Firebase Remote Config for the settings in SPEC section 9.
- src/lib/settings.ts: getRemoteConfig with in-app defaults; minimumFetchIntervalMillis of 1 hour in production and 1 minute in development; loadSettings() calls fetchAndActivate once on app start (browser only, never blocks the UI, falls back to defaults on any error); getSettings() returns typed values.
- Use the settings everywhere: cloud_model (inCloudParams.model of hybridModel and cloudModel; create these models after settings load, or recreate them if cloud_model changes), device_max_chars (router), scan_chunk_chars (scan) and history_enabled (hide history when false).
- Add a "Diagnostics" panel on /about showing the active settings, the device status and the source of the last answer.
Run lint, test and build.
```

<!-- id:P9 -->
### P9 · Design polish
```text
Polish SafeShare so it feels like a complete product (this is judged under "Design"). Review every screen and improve it:
- Landing: a clear headline and one-sentence promise; a simple 3-step diagram (On-device scan -> Masked text -> Cloud AI); the device status card; two CTAs; a trust section "What never leaves your device".
- Workspace: empty states, loading skeletons, helpful microcopy, one clear primary action per step, undo for item toggles, and Ctrl+Enter to run a task.
- Consistency: spacing and typography; green = on-device and blue = cloud everywhere; dark mode with prefers-color-scheme.
- Accessibility: visible focus rings, labels, AA contrast and reduced-motion support.
- A favicon and an Open Graph image (a simple SVG shield).
When you finish, list the changes you made for each screen so I can check them in the browser.
```

<!-- id:P9b -->
### P9b · Fix from a screenshot (repeat as needed)
```text
[paste or Shift+drag a screenshot here]
This is the /workspace Review step at 1440 px wide. Problems I see: [describe them]. Fix them while keeping our colour rules and accessibility. Tell me what you changed.
```

<!-- id:P10 -->
### P10 · Prepare the production deploy
```text
Prepare SafeShare for deployment to Firebase Hosting. Do not run any deploy command yourself.
- firebase.json: hosting serves "out", and routes /workspace, /history and /about load correctly with our static export (trailingSlash: true creates folders with index.html). Add long cache headers for /_next/static/** and no-cache for HTML. Include the Firestore rules.
- Make sure /playground renders "Not available" in production, and that the App Check debug-token code cannot run in a production build.
- Add the npm script "deploy": "npm run build && firebase deploy --only hosting,firestore".
- Search the whole repo for secrets: anything other than the public Firebase web config, debug tokens, .env files or real personal data. Report what you find.
- Tell me how to test the production build locally with: npm run build && firebase emulators:start --only hosting
Then give me the exact list of commands and console steps I must do to deploy.
```

<!-- id:P11 -->
### P11 · Final review, README and license
```text
Final quality pass before submission.
1. Use a subagent to review the whole codebase against the "Hard rules" in CLAUDE.md and sections 10 and 11 of docs/SPEC.md. Report only real gaps (privacy leaks, wrong inference modes, a missing leakCheck, secrets, console logs of document text), not style preferences. Then fix the gaps.
2. Write README.md: one-line pitch, live URL, demo video link (placeholder), screenshots (placeholders in docs/screenshots/), a section "How SafeShare uses Firebase AI Logic hybrid inference" (a table of feature, inference mode and why, linking to the source files), a Mermaid architecture diagram, the privacy design, how to run it locally on Ubuntu (Node, env vars, Chrome flag), testing instructions for judges (including how it behaves without Gemini Nano), the tech stack, and the license (Apache-2.0).
3. Confirm that LICENSE (Apache-2.0) exists and that package.json has "license": "Apache-2.0".
Run lint, test and build one last time and show me the output.
```

<!-- id:P12 -->
### P12 · Devpost text
```text
Read README.md and docs/SPEC.md, then write docs/DEVPOST.md for the hackathon submission with these sections: Inspiration, What it does, How we built it, How we use Firebase AI Logic (modes, routing, structured output, inferenceSource, fallback), Challenges, Accomplishments, What we learned, What's next, Built during the submission period, and Testing instructions. Use plain, honest English with no exaggeration, about 600 words.
```

<!-- id:COMMIT -->
### Commit (after every phase)
```text
Show me a short summary of git diff --stat, then commit all changes with a clear conventional message for this phase (for example "feat: privacy scan engine with tests") and push to origin.
```

<!-- id:FIX -->
### When something breaks
```text
[paste the exact error message or a screenshot]
This happens when I [describe the steps]. Find the root cause, fix it, and prove the fix by running the relevant test or the build. Don't suppress the error.
```
