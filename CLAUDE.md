# CLAUDE.md

## Project Overview
Seam carving implementation for content-aware image resizing. Two implementations:
- Java (original): `project/src/main/java/`
- Web app (TypeScript/Next.js): `web/`

## Web App Commands
- `cd web && npm run dev` — start Next.js dev server
- `cd web && npm run build` — build static export
- `cd web && npm run lint` — ESLint

## Web App Tech Stack
- Next.js 16 (App Router, static export)
- React 19, TypeScript, Tailwind CSS 4
- Web Worker for background processing
- Canvas API for image I/O

## Web App Structure
- `web/src/app/` — Next.js pages and layout
- `web/src/lib/seam-carving.ts` — core algorithm (pure functions)
- `web/src/lib/seam-carving.worker.ts` — Web Worker wrapper
- `web/src/components/image-resizer.tsx` — main UI component

## Deployment
- GitHub Pages at https://shrink.narula.xyz
- Auto-deploys on push to master via `.github/workflows/deploy.yml`
- Build output: `web/out/`
- Main branch: master
