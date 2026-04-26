# RiyadhFlow 🚗

A Riyadh-first map & routing app. Plan drive / walk / bike / metro routes, browse places by category, get speed-camera and prayer-time awareness, and share a single URL that restores everything.

> **Status:** actively developed. All code currently lives under [`client/`](client/) — it's a Next.js app that doubles as the backend (API routes + Prisma). The top-level [`server/`](server/) directory is reserved for future expansion and is empty today.

---

## Table of contents

1. [Features](#features)
2. [Full stack](#full-stack)
3. [Architecture at a glance](#architecture-at-a-glance)
4. [Getting started](#getting-started)
5. [Tips for understanding the codebase](#tips-for-understanding-the-codebase)
6. [Learning roadmap](#learning-roadmap)
7. [Where to look next](#where-to-look-next)

---

## Features

- 🗺 **Interactive Mapbox map** with category pins, custom markers, traffic overlay, theme-aware styles.
- 🛣 **Multi-mode routing** — drive / walk / bike via Mapbox Directions; **metro** via a custom Dijkstra over OSM-imported Riyadh Metro data.
- 📍 **Multi-stop routing** — up to 2 intermediate waypoints, reflected in the Directions URL and Google Maps handoff.
- 🔎 **Place search bar** — merges Postgres fuzzy search with Mapbox Searchbox suggestions; click a result to fly the map and open the detail card.
- 🕘 **Saved trips + auto-captured recent trips** (FIFO, capped, deduped) — both persisted in `localStorage`.
- 🚨 **Speed camera alerts** — 35 cameras pulled from OSM, rendered only on driving routes, surfaced as a pluralized badge on the route summary.
- 🕌 **Prayer times awareness** — Aladhan API (Umm-Al-Qura / method 4), cached per-day; header pill shows next prayer + countdown (`Maghrib · 14 min` or `Dhuhr · 1h 43m`), plus a "may close soon" hint on PlaceCards for restaurants / hotels / museums / pharmacies.
- 🌐 **English + Arabic with RTL**, theme toggle (light/dark), URL-synced state for sharable links, geolocation + near-me mode.

---

## Full stack

| Layer | Tech | Notes / version |
|---|---|---|
| Framework | **Next.js 13 (App Router)** | `client/app/**`, RSC + client components |
| UI runtime | **React 18**, **TypeScript** | strict mode, RSC where possible |
| Styling | Hand-written **CSS** (`client/app/globals.css`) with CSS custom properties | no CSS-in-JS; Storybook also present |
| Maps | **mapbox-gl** 3.x | Map, layers, markers, RTL plugin, Directions API, Searchbox API |
| Internationalization | **next-intl** 4.x | `client/messages/{en,ar}.json`, ICU plurals, RTL |
| State | React hooks + `localStorage` + URL `searchParams` | no Redux / Zustand |
| Database | **PostgreSQL** with **PostGIS** + **pg_trgm** | geometry + fuzzy text search |
| ORM | **Prisma** 6.x | `client/prisma/schema.prisma` |
| API layer | **Next.js Route Handlers** | `client/app/api/places/**` |
| External APIs | Mapbox Directions / Searchbox / Geocoding, OpenStreetMap **Overpass**, **Aladhan** | prayer times, OSM extracts |
| Data scripts | **tsx** | `client/prisma/import-*.ts` (OSM POIs, metro, speed cameras) |
| Unit / component tests | **Vitest** + **@testing-library/react** + **jsdom** | `client/tests/unit/**` |
| E2E tests | **Playwright** | `client/tests/e2e/**` |
| Stories | **Storybook 7 (Next.js)** | component isolation |
| Quality gates | **ESLint** (next config), **tsc --noEmit**, **Lighthouse CI** | `.lighthouserc.json` |
| CI | **GitHub Actions** | `.github/workflows/client-ci.yml` — lint → typecheck → unit → build → E2E → Storybook → Lighthouse |

**Not in use** (to help you skim the repo quickly): no Redux, no TanStack Query, no tRPC, no GraphQL, no Tailwind, no CSS modules, no Jest, no Webpack custom config, no Docker.

---

## Architecture at a glance

```
┌─────────────────────────────────────────────────────────────┐
│ app/page.tsx  (one big client page composing feature slices)│
└─────────────────────────────────────────────────────────────┘
        │
        ├── features/routing/       ← drive/walk/bike/metro, waypoints, URL state
        │     hooks/    useRoutePlanner, useUrlSyncedRouteState, useSearchSuggestions
        │     services/ geocoding, searchSuggestions (Mapbox), placesAutocomplete (DB), transitRouting (metro Dijkstra)
        │     utils/    urlState, deeplinks, trafficInsights, speedCameras
        │     data/     riyadh-metro.json, riyadh-speed-cameras.json
        │
        ├── features/places/        ← category pills, PlaceCard, PlaceSearchBar
        ├── features/prayer/        ← usePrayerTimes, PrayerStatusPill, prayerTimes utils
        ├── features/trips/         ← useSavedTrips, useRecentTrips
        ├── features/theme/         ← light/dark toggle
        │
        ├── components/Map.tsx      ← the one heavy Mapbox GL component
        ├── api/places/**           ← DB-backed GET endpoints (list + fuzzy search)
        ├── i18n/                   ← locale provider + helpers
        └── utils/mockData.ts       ← Category labels (English names are canonical)

prisma/
  schema.prisma      ← Place model, Category enum, PostGIS + trigram extensions
  migrations/**      ← generated
  seed.ts            ← seed script
  import-osm.ts      ← OSM POI import (large)
  import-metro.ts    ← Riyadh Metro lines + stations from Overpass
  import-speed-cameras.ts  ← highway=speed_camera / enforcement=maxspeed
```

Each feature slice owns its **hooks + services + utils + components**. `page.tsx` composes them; [`Map.tsx`](client/app/components/Map.tsx) is the only component that talks to `mapbox-gl` directly.

---

## Getting started

```bash
cd client
npm install
cp .env.local.example .env.local  # create this yourself (see below)
npm run dev
```

Open <http://localhost:3000>. Without any env vars the app still renders — the map shows a fallback notice, and DB-backed features return empty lists.

### Environment variables

Create `client/.env.local`:

```env
# Required for the map to render
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_public_token

# Required for DB-backed places (Postgres with PostGIS + pg_trgm)
DATABASE_URL=postgresql://user:pass@localhost:5432/riyadhflow
```

### Setting up the database (optional but recommended)

```bash
cd client
npm run db:migrate     # applies Prisma migrations (enables postgis + pg_trgm)
npm run db:seed        # seeds the places table from the built-in fixture
npm run import:metro   # pulls Riyadh Metro lines from OpenStreetMap (~30s)
npm run import:cameras # pulls fixed speed cameras (~5s)
npm run db:import:osm  # large OSM POI extract (slow — only if you want real POIs in the DB)
```

See the [client README](client/README.md) for all scripts.

---

## Tips for understanding the codebase

1. **Read [`app/page.tsx`](client/app/page.tsx) first.** It's the orchestrator — every feature slice enters and leaves through here. Once you can map every block in `page.tsx` to a feature directory, the rest is local reading.
2. **Trust the feature slices.** If you're touching routing, stay in `features/routing/` until a type forces you into another slice. Each slice is intentionally self-contained (its own hooks + services + utils).
3. **Hooks return contracts, not state.** `useRoutePlanner`, `useUrlSyncedRouteState`, `useSearchSuggestions`, `usePrayerTimes` each return a narrow public surface. Read the return type at the bottom of the file before reading the implementation — it's the API.
4. **Two search backends, one hook.** [`useSearchSuggestions`](client/app/features/routing/hooks/useSearchSuggestions.ts) merges Postgres (`/api/places/search`) and Mapbox Searchbox with `Promise.allSettled`, dedupes by lowercased name, caps at 8. This is reused by both `AutocompleteInput` (routing) and `PlaceSearchBar` (search).
5. **The map is big; don't rewrite it.** [`Map.tsx`](client/app/components/Map.tsx) owns Mapbox layer lifecycles (route, alternates, transit, cameras, traffic, places, user-location puck). When adding a map feature, follow the **source-id + layer-id + clear-on-cleanup** pattern already used by every other layer.
6. **i18n is mandatory for every user string.** Add keys to both `messages/en.json` and `messages/ar.json`. ICU plurals (`{count, plural, ...}`) are used for counts in Arabic.
7. **URL state is the source of truth for routing inputs.** `useUrlSyncedRouteState` owns `start`, `destination`, `mode`, `category`, `waypoints`. Anything shareable lives there; anything ephemeral (map camera, selected place, prayer pill expanded) lives in local component state.
8. **localStorage keys are documented in-place.** Search for `riyadhFlow` to find every cache key: saved trips, recent trips, prayer times.
9. **External API patterns repeat.** All importers (`import-*.ts`) share the same Overpass multi-endpoint fallback. Geocoding, transit plans, and prayer fetches all use `AbortController` for cancelation. Copy the nearest sibling's pattern when adding a new integration.
10. **Tests are optional but cheap.** Pure utilities get unit tests (`speedCameras`, `prayerTimes`, `deeplinks`, `urlState`, `trafficInsights`, `transitRouting`). UI behavior is covered by Playwright.

---

## Learning roadmap

A suggested path through this stack if you're coming in fresh. Each bullet is an afternoon-to-a-week depending on depth.

### Foundation (must have before you change real code)
1. **JavaScript → TypeScript** — generics, discriminated unions, `as const`, narrowing. [Matt Pocock's free cheat-sheets](https://www.totaltypescript.com/) and the TS handbook's "Narrowing" chapter.
2. **Modern React** — function components, hooks (`useState`, `useEffect`, `useCallback`, `useRef`), controlled inputs. [React docs](https://react.dev) — especially "Synchronizing with Effects" and "Separating Events from Effects."
3. **Next.js 13 App Router** — server vs client components (`'use client'`), route handlers (`app/api/**/route.ts`), layouts, `next/image`. The [Next learn course](https://nextjs.org/learn) is one sitting.

### Core skills (needed to confidently ship a feature)
4. **Mapbox GL JS** — sources vs layers, `addSource` / `addLayer`, marker lifecycle, `fitBounds`. The [Mapbox GL JS examples gallery](https://docs.mapbox.com/mapbox-gl-js/example/) is the fastest way in.
5. **Mapbox Directions + Searchbox APIs** — read the Directions response shape (`route.geometry.coordinates`, `legs[].steps`). For Searchbox, understand the `/suggest` → `/retrieve` two-step flow and session tokens.
6. **next-intl** — `useTranslations`, ICU MessageFormat plural syntax, RTL toggling. [next-intl docs](https://next-intl.dev).
7. **Prisma + PostgreSQL** — `schema.prisma` modeling, migrations, the `Unsupported("geometry(Point, 4326)")` trick for PostGIS, raw SQL via `prisma.$queryRaw`. [Prisma docs "Getting Started"](https://www.prisma.io/docs/getting-started).
8. **PostGIS + pg_trgm** — `ST_DWithin`, `ST_Distance`, `similarity()`, creating the GIN index on `gin_trgm_ops`. The official [PostGIS tutorial](https://postgis.net/workshops/postgis-intro/) is excellent.

### Polish layer (valuable once you're productive)
9. **Vitest + Testing Library + jsdom** — `renderHook`, `act`, shimming browser globals (see `useRecentTrips.test.ts` for the localStorage shim).
10. **Playwright** — `page.goto`, `page.getByRole`, trace viewer. Our one E2E flow is the cheat sheet.
11. **Storybook 7 / Next.js preset** — stories as contracts for components in isolation.
12. **Lighthouse CI** — `.lighthouserc.json`, how assertions map to budget failures in PRs.
13. **GitHub Actions** — read `.github/workflows/client-ci.yml` top-to-bottom once; it's the reference for how we gate merges.

### Domain references you can skim as they become relevant
- **OpenStreetMap Overpass QL** — the query syntax in `import-metro.ts` and `import-speed-cameras.ts`.
- **Aladhan Prayer Times API** — method 4 (Umm Al-Qura) is the Saudi standard.
- **Haversine + line-segment distance** — see `client/app/features/routing/utils/speedCameras.ts` for the planar shortcut we use near Riyadh's latitude.
- **Dijkstra on a transit graph** — `features/routing/services/transitRouting.ts`.

### Budget-friendly order if you only have a weekend

> TypeScript basics → React hooks → Next.js App Router → one Mapbox example → open `Map.tsx` and read one feature slice end-to-end (I'd pick `features/trips/` — smallest).

---

## Where to look next

- Deep dive on the frontend (scripts, Storybook, Lighthouse, CI stages): [`client/README.md`](client/README.md).
- Feature-specific entry points:
  - Routing: [`useRoutePlanner`](client/app/features/routing/hooks/useRoutePlanner.ts), [`Map.tsx`](client/app/components/Map.tsx)
  - Search: [`useSearchSuggestions`](client/app/features/routing/hooks/useSearchSuggestions.ts), [`PlaceSearchBar`](client/app/features/places/components/PlaceSearchBar.tsx)
  - Metro: [`transitRouting.ts`](client/app/features/routing/services/transitRouting.ts), [`import-metro.ts`](client/prisma/import-metro.ts)
  - Speed cameras: [`speedCameras.ts`](client/app/features/routing/utils/speedCameras.ts), [`import-speed-cameras.ts`](client/prisma/import-speed-cameras.ts)
  - Prayer times: [`usePrayerTimes`](client/app/features/prayer/hooks/usePrayerTimes.ts), [`PrayerStatusPill`](client/app/features/prayer/components/PrayerStatusPill.tsx)

## License

See [LICENSE](LICENSE).
