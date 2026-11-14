# SafeShare: project memory for Claude Code

SafeShare lets people use cloud AI on private documents without sending their personal data to the cloud.
Gemini Nano (on-device, inside Chrome) finds and masks personal data. Cloud Gemini only ever sees masked text.
Built for the #BuildHybridAI 2026 hackathon (Web / Chrome category).
Full product and technical spec: docs/SPEC.md (read it at the start of every new phase).

## Stack
- Next.js (App Router) + TypeScript (strict) + Tailwind CSS, static export (`output: "export"`, `trailingSlash: true`)
- Firebase JS SDK: AI Logic (`firebase/ai`), App Check (reCAPTCHA Enterprise), Auth (anonymous), Firestore, Remote Config
- Hosting: Firebase Hosting, serving the `out/` folder
- Tests: Vitest for pure logic in `src/lib/**`

## Commands
- `npm run dev`: dev server on http://localhost:3000 (test in Google Chrome)
- `npm run lint`, `npm run test`, `npm run build`: all three must pass before you say a task is done
- `firebase deploy`: only when I ask; never deploy on your own

## Hard rules (privacy is the product)
- IMPORTANT: Raw user text and images must NEVER be sent to a cloud model. Only masked text may reach the cloud.
- The privacy scan and image reading use `InferenceMode.ONLY_ON_DEVICE`. Never change them to a cloud-capable mode.
- Before every task call (hybrid or cloud), run `leakCheck()` on the masked text. If it finds personal data, block the call.
- The placeholder map (`[PERSON_1]` -> real value) lives only in memory. Never store it, log it or send it.
- Never write document text, prompts or AI answers to the console in committed code.
- All AI inference goes through Firebase AI Logic (`firebase/ai`). Chrome's `LanguageModel.availability()` may be used ONLY to show device status in the UI.
- Use only invented sample data (fake names, fake numbers) in code, tests, fixtures and screenshots.

## Code rules
- Firebase and AI code runs only in the browser: `"use client"` components, event handlers and `useEffect`. Never in Server Components.
- Create each Firebase object and each model once (lazy singletons in `src/lib/`).
- `initializeDeviceModel()` must be called from a user click.
- Every AI result shows where it ran with `<SourceBadge>`, using `response.inferenceSource` (`ON_DEVICE` / `IN_CLOUD`).
- Config comes from `NEXT_PUBLIC_*` env vars in `.env.local` (never committed). Keep `.env.example` up to date.
- Pure logic lives in `src/lib/` with Vitest tests. UI lives in `src/components/`. Keep files small and focused.
- Colours: on-device = green, cloud = blue, accent = orange. Use them consistently.

## Firebase AI Logic quick facts
- Modes: `PREFER_ON_DEVICE`, `ONLY_ON_DEVICE`, `PREFER_IN_CLOUD`, `ONLY_IN_CLOUD`.
- Structured output: cloud uses `inCloudParams.generationConfig` (`responseMimeType: "application/json"`, `responseSchema`); on-device uses `onDeviceParams.promptOptions.responseConstraint`.
- On-device cannot do multi-turn chat, PDF, audio, video or tools. Images: JPEG/PNG only.
- When unsure about an API, check the Firebase AI Logic skill or the docs before coding:
  https://firebase.google.com/docs/ai-logic/hybrid/web/get-started
  https://firebase.google.com/docs/ai-logic/hybrid/web/configuration-options

## Workflow
- For changes across several files, propose a short plan first and stay inside the current phase's scope.
- After changes, run lint, test and build, fix root causes (don't silence errors), then summarise what changed and how I can test it by hand.
- When compacting, keep the list of modified files and any open TODOs.
