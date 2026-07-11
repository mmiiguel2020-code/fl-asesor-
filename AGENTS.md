# AGENTS.md

## Cursor Cloud specific instructions

### Overview
Single-product repo (not a monorepo): **FL Studio Resource Advisor**, an AI-powered React 19 + Vite 6 web app with a small Express backend that proxies Google Gemini. There is no database or other auxiliary service. Standard commands live in `package.json` scripts and `README.md`.

### Services
There is exactly **one** local service. In dev, a single Node process (`tsx server.ts`) runs Express with Vite in middleware mode, serving both the React SPA and the `/api/gemini/*` backend on the **same port `3000`** (hardcoded in `server.ts`). There is no separate frontend dev port.

### Running / non-obvious caveats
- Dev: `npm run dev` → `http://localhost:3000`. Lint: `npm run lint` (`tsc --noEmit`). Build: `npm run build` (Vite client bundle + esbuild server → `dist/server.cjs`). Prod: `NODE_ENV=production npm run start`.
- The server reads env via `dotenv` from `.env` (and `.env.local`). `README.md` mentions `.env.local`, but `.env` also works. Copy `.env.example` to `.env`. `.env*` is gitignored (except `.env.example`), so it must be recreated per environment; it is not restored by the update script.
- `GEMINI_API_KEY` is **required only for the AI features** (screenshot analysis + chat, endpoints `/api/gemini/analyze` and `/api/gemini/chat`). Without a valid key those endpoints return HTTP 500 (`API_KEY_INVALID`), but the app boots and the entire client-side **simulator** (buffer/sample-rate/latency, Smart Disable, Multithreaded, Triple Buffer toggles), shortcuts, and terminal tabs work fully offline. Set `GEMINI_API_KEY` in `.env` to exercise the AI paths.
- UI text is Spanish by design; this is not a localization bug.
