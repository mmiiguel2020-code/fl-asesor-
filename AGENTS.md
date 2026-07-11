# AGENTS.md

## Cursor Cloud specific instructions

### What this is
Single-product app: **"Asesor de Optimización FL Studio"**, a Spanish-language React 19 + Vite 6 frontend served by an Express server (`server.ts`) that runs both the SPA (Vite middleware in dev) and two Gemini-backed API routes (`/api/gemini/analyze`, `/api/gemini/chat`). No database, no separate services. The whole thing is one Node process on port `3000`.

### Commands (defined in `package.json`)
- Run (dev): `npm run dev` — runs `tsx server.ts`, Express + Vite HMR on `http://localhost:3000`.
- Lint / typecheck: `npm run lint` — `tsc --noEmit` (no ESLint configured).
- Build: `npm run build` — `vite build` + esbuild bundle to `dist/server.cjs`.
- Run (prod): `NODE_ENV=production npm run start` — serves prebuilt `dist/`.

### Non-obvious caveats
- **Port `3000` is hard-coded** in `server.ts` (not configurable via env).
- The Gemini AI features (Analyzer + Chat tabs) require a valid **`GEMINI_API_KEY`** env var (put it in a gitignored `.env.local`). Without it the server still starts and the SPA loads fine, but `/api/gemini/*` return `500`. It prints `API key should be set when using the Gemini API.` on startup — this is expected when no key is set.
- Much of the app works **without** any API key: the FL Studio screenshot **simulator** (canvas-generated preview that updates live from the parameter sliders in `src/canvasHelper.ts`), the **Terminal** command simulator, keyboard **Shortcuts**, and latency test. Use these to smoke-test the environment offline.
- Gemini model is `gemini-3.5-flash` in `server.ts`.
- No automated test suite exists (no `test` script / framework). The only e2e mechanism is the Datadog Synthetics GitHub Action, which runs against a deployed URL (CI-only, needs `DD_API_KEY`/`DD_APP_KEY`).
- No lockfile is committed; `npm install` resolves from `package.json` ranges.
