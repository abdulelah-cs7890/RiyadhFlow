# Learning roadmap

A suggested path through this stack if you're coming in fresh. Each bullet is an afternoon-to-a-week depending on depth.

## Foundation (must have before you change real code)

1. **JavaScript → TypeScript** — generics, discriminated unions, `as const`, narrowing. [Matt Pocock's free cheat-sheets](https://www.totaltypescript.com/) and the TS handbook's "Narrowing" chapter.
2. **Modern React** — function components, hooks (`useState`, `useEffect`, `useCallback`, `useRef`), controlled inputs. [React docs](https://react.dev) — especially "Synchronizing with Effects" and "Separating Events from Effects."
3. **Next.js 13 App Router** — server vs client components (`'use client'`), route handlers (`app/api/**/route.ts`), layouts, `next/image`. The [Next learn course](https://nextjs.org/learn) is one sitting.

## Core skills (needed to confidently ship a feature)

4. **Mapbox GL JS** — sources vs layers, `addSource` / `addLayer`, marker lifecycle, `fitBounds`. The [Mapbox GL JS examples gallery](https://docs.mapbox.com/mapbox-gl-js/example/) is the fastest way in.
5. **Mapbox Directions + Searchbox APIs** — read the Directions response shape (`route.geometry.coordinates`, `legs[].steps`). For Searchbox, understand the `/suggest` → `/retrieve` two-step flow and session tokens.
6. **next-intl** — `useTranslations`, ICU MessageFormat plural syntax, RTL toggling. [next-intl docs](https://next-intl.dev).
7. **Prisma + PostgreSQL** — `schema.prisma` modeling, migrations, the `Unsupported("geometry(Point, 4326)")` trick for PostGIS, raw SQL via `prisma.$queryRaw`. [Prisma docs "Getting Started"](https://www.prisma.io/docs/getting-started).
8. **PostGIS + pg_trgm** — `ST_DWithin`, `ST_Distance`, `similarity()`, creating the GIN index on `gin_trgm_ops`. The official [PostGIS tutorial](https://postgis.net/workshops/postgis-intro/) is excellent.

## Polish layer (valuable once you're productive)

9. **Vitest + Testing Library + jsdom** — `renderHook`, `act`, shimming browser globals (see `useRecentTrips.test.ts` for the localStorage shim).
10. **Playwright** — `page.goto`, `page.getByRole`, trace viewer. Our one E2E flow is the cheat sheet.
11. **Storybook 7 / Next.js preset** — stories as contracts for components in isolation.
12. **Lighthouse CI** — `.lighthouserc.json`, how assertions map to budget failures in PRs.
13. **GitHub Actions** — read `.github/workflows/client-ci.yml` top-to-bottom once; it's the reference for how we gate merges.

## Domain references you can skim as they become relevant

- **OpenStreetMap Overpass QL** — the query syntax in `import-metro.ts` and `import-speed-cameras.ts`.
- **Aladhan Prayer Times API** — method 4 (Umm Al-Qura) is the Saudi standard.
- **Haversine + line-segment distance** — see `client/app/features/routing/utils/speedCameras.ts` for the planar shortcut we use near Riyadh's latitude.
- **Dijkstra on a transit graph** — `features/routing/services/transitRouting.ts`.

## Budget-friendly order if you only have a weekend

> TypeScript basics → React hooks → Next.js App Router → one Mapbox example → open `Map.tsx` and read one feature slice end-to-end (I'd pick `features/trips/` — smallest).
