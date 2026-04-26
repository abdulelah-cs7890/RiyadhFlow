# RiyadhFlow Frontend

RiyadhFlow is a Next.js + TypeScript map experience focused on smart route planning inside Riyadh.  
This project demonstrates frontend architecture, map interactions, state synchronization, accessibility, testing, and CI quality gates.

## Highlights

- 🌐 **Deployed on Vercel** at <https://riyadhflow2.vercel.app/> with Vercel Analytics (pageviews + Web Vitals)
- Hyper-glass UI with responsive desktop/mobile behavior
- Interactive Mapbox map with category-based place pins and traffic overlay
- Four travel modes: **drive / walk / bike / metro** (metro routed via a local Dijkstra over OSM-imported Riyadh Metro data)
- Multi-stop routing (up to 2 waypoints) reflected in the Directions URL and Google Maps handoff
- Place search bar merging Postgres fuzzy search with Mapbox Searchbox suggestions
- Place details card with media, reviews, and one-click route intent; falls back to a category-emoji banner when no image is available
- Speed camera alerts rendered on driving routes (static OSM data, 40 m proximity threshold)
- Prayer times awareness (Aladhan / Umm Al-Qura) — header pill + "may close soon" warning on closure-sensitive place cards
- **English + Arabic with RTL** via `next-intl`, theme toggle (light/dark)
- URL-synced app state (`start`, `destination`, `category`, `mode`, `waypoints`, coords) for fully shareable links
- Saved trips + auto-captured recent trips (FIFO, capped, deduped), persisted in `localStorage`
- **Postgres + PostGIS + pg_trgm** via Prisma for places data, exposed through Next.js route handlers
- Type-safe data modeling for categories, places, route steps, waypoints, and prayer times
- Unit + component tests (Vitest + Testing Library)
- End-to-end user flow test (Playwright)
- Component-driven development with Storybook
- Lighthouse CI quality checks for performance/accessibility/best-practices
- Automated CI pipeline (lint, typecheck, tests, build, E2E, Storybook, Lighthouse)

## Architecture

```mermaid
flowchart TD
  A[app/page.tsx] --> B[Routing Hooks]
  A --> C[Places Components]
  A --> D[Trips Hooks]
  A --> E[Map Component]

  B --> B1[useRoutePlanner]
  B --> B2[useUrlSyncedRouteState]
  B1 --> B3[geocoding service]
  B1 --> B4[traffic insights utils]
  B2 --> B5[url state utils]

  C --> C1[CategoryBar]
  C --> C2[PlaceCard]
  C --> C3[category constants]
  E --> C4[mockCategoryData]
  D --> D1[useSavedTrips]
```

## Project Structure

```text
app/
  components/
    Map.tsx                       # single heavy mapbox-gl surface
  api/
    places/
      route.ts                    # GET /api/places?category=...
      search/route.ts             # GET /api/places/search?q=...
  features/
    places/                       # PlaceCard, PlaceSearchBar, CategoryBar, usePlaces
    prayer/                       # usePrayerTimes, PrayerStatusPill, prayerTimes utils
    routing/                      # drive/walk/bike/metro, waypoints, alternatives, URL state
      hooks/    useRoutePlanner, useUrlSyncedRouteState, useSearchSuggestions
      services/ geocoding, searchSuggestions (Mapbox), placesAutocomplete (DB), transitRouting (metro Dijkstra)
      utils/    urlState, deeplinks, trafficInsights, speedCameras
      data/     riyadh-metro.json, riyadh-speed-cameras.json
    trips/                        # useSavedTrips, useRecentTrips
    theme/                        # light/dark toggle
  i18n/                           # locale provider + helpers
  utils/
    mockData.ts                   # Category labels (English canonical)
messages/
  en.json, ar.json                # next-intl catalogs (ICU plurals, RTL)
prisma/
  schema.prisma                   # Place model (PostGIS + trigram)
  migrations/**
  seed.ts
  import-osm.ts                   # large OSM POI import
  import-metro.ts                 # Riyadh Metro lines + stations (Overpass)
  import-speed-cameras.ts         # fixed speed cameras (Overpass)
```

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

Create `client/.env.local`:

```bash
# Required for the map to render
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_public_token

# Required for DB-backed places (Postgres with PostGIS + pg_trgm).
# Without it, /api/places and /api/places/search return empty.
DATABASE_URL=postgresql://user:pass@localhost:5432/riyadhflow
```

If the Mapbox token is missing, the UI still renders and displays a map fallback notice. If `DATABASE_URL` is missing, the app falls back gracefully — Mapbox-only search results, no DB-backed POIs.

## Available Scripts

### App
- `npm run dev` - Start local dev server
- `npm run lint` - Run Next.js + TypeScript lint rules
- `npm run typecheck` - Run TypeScript checks
- `npm run test:unit` - Run Vitest unit/component tests
- `npm run test:e2e` - Run Playwright E2E tests
- `npm run storybook` - Run Storybook locally
- `npm run build-storybook` - Build static Storybook
- `npm run lighthouse:ci` - Run Lighthouse CI checks
- `npm run build` - Production build
- `npm run start` - Run production server

### Database
- `npm run db:migrate` - Apply Prisma migrations (also enables `postgis` + `pg_trgm`)
- `npm run db:seed` - Seed the `places` table from the bundled fixture
- `npm run db:studio` - Open Prisma Studio
- `npm run db:generate` - Regenerate the Prisma client

### Data importers (Overpass / OSM)
- `npm run import:metro` - Pull Riyadh Metro lines + stations (~30s)
- `npm run import:cameras` - Pull fixed speed cameras (~5s)
- `npm run db:import:osm` - Large OSM POI extract into Postgres (slow)

## Testing

### Unit / Component

- Framework: Vitest
- Renderer: Testing Library
- Config: `vitest.config.ts`
- Coverage: enabled with V8 provider

### E2E

- Framework: Playwright
- Config: `playwright.config.ts`
- Includes a core flow test for:
  - filling route fields
  - saving a trip
  - category filter URL sync

## Storybook

- Framework: `@storybook/nextjs`
- Config: `.storybook/main.ts`
- Stories included for:
  - `CategoryBar`
  - `PlaceCard`
  - `RouteAlternativesPanel`

## Internationalization (next-intl)

- Catalogs live under `messages/en.json` and `messages/ar.json`.
- Server and client components both call `useTranslations('namespace')`. Namespaces are top-level keys (`routing`, `places`, `prayer`, `trips`, etc.).
- ICU MessageFormat plurals are used for counts. Arabic uses `zero / one / two / few / many / other` cases — see `routing.camerasOnRoute` for an example.
- The locale provider in `app/i18n/` toggles `dir="rtl"` on Arabic so all flexbox / grid logical properties (`inset-inline-start`, `padding-inline-end`) flip automatically.
- Rule: every user-visible string goes in both catalogs. No hardcoded text.

## Database (Prisma + PostGIS)

- Schema: `prisma/schema.prisma` — single `Place` model plus a `Category` enum.
- Two Postgres extensions are required:
  - **PostGIS** — for the `geometry(Point, 4326)` location column. Modeled with `Unsupported(...)` because Prisma doesn't natively type PostGIS geometry yet.
  - **pg_trgm** — for fuzzy text search powering `/api/places/search` (similarity threshold 0.3 + GIN index on `name` and `name_ar`).
- Distance ranking uses `ST_DWithin` and `ST_Distance` via raw SQL (`prisma.$queryRaw`).
- API routes:
  - `GET /api/places?category=RESTAURANTS&lat=24.7&lng=46.7&radius=2000` — category-filtered, optionally proximity-ranked.
  - `GET /api/places/search?q=kingdom&lat=...&lng=...` — fuzzy text + distance.

## Lighthouse CI

- Config: `.lighthouserc.json`
- Assertions include:
  - performance (warning threshold)
  - accessibility (error threshold)
  - best-practices (error threshold)
  - SEO (warning threshold)

## CI

GitHub Actions workflow: `.github/workflows/client-ci.yml`

Pipeline stages:

1. Lint
2. Typecheck
3. Unit tests
4. Build
5. E2E tests + Playwright artifact upload
6. Storybook build + artifact upload
7. Lighthouse CI + artifact upload

## Resume Talking Points

- Modular frontend architecture with domain-based feature slices
- URL-state synchronization for shareable, reproducible UX state
- Typed API/data boundaries and predictable state management
- Accessibility-first interactions (`aria`, keyboard marker support, focus-visible states)
- Production-grade quality workflow with automated tests + CI
