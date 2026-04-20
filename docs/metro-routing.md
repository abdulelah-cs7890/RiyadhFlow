# Metro routing

Riyadh Metro opened in late 2024 / early 2025 (six lines, ~85 stations). RiyadhFlow now supports it as a fourth travel mode alongside **drive / walk / bike**: pick **🚇 Metro** and the app plans a door-to-door `walk → train → walk` trip, renders it on the map in each line's official colors, and shows a leg-by-leg summary card in English or Arabic.

## What's new

- **Fourth travel mode** — Metro added to the travel-mode switcher (`TravelMode` now `'driving' | 'walking' | 'cycling' | 'metro'`).
- **Transit routing service** — [client/app/features/routing/services/transitRouting.ts](../client/app/features/routing/services/transitRouting.ts) runs Dijkstra over a station graph and returns a plan with walk/train legs, total minutes, and transfer count. Returns a `no-route` result when the start or end is more than 2 km from any station.
- **Transit map layers** — [client/app/components/Map.tsx](../client/app/components/Map.tsx) draws dashed walk segments, colored train segments (one layer per line, colored from the plan), and circle markers at board/alight stations. The Mapbox Directions call is skipped in metro mode.
- **Summary card** — [client/app/features/routing/components/TransitSummaryCard.tsx](../client/app/features/routing/components/TransitSummaryCard.tsx) shows leg-by-leg breakdown with localized station/line names. Full Arabic + RTL support, including ICU-pluralized transfer counts.
- **No-route empty state** — when no station is within range, the UI shows "Nearest station is X km away — switch to driving."
- **Committed static data** — [client/app/features/routing/data/riyadh-metro.json](../client/app/features/routing/data/riyadh-metro.json) (6 lines, 83 stations, 10 interchanges). No runtime dependency on OpenStreetMap.

## Out of scope

SAPTCO buses, real-time train positions, fare calculation, park-and-ride combinations.

## Architecture

### Data pipeline

The network is static — a Node script extracts it once and commits the result:

```bash
cd client
npm run import:metro
```

This runs [client/prisma/import-metro.ts](../client/prisma/import-metro.ts), which:

1. Queries Overpass for `route=subway` relations tagged `network=Riyadh Metro` (line names, colors, geometry).
2. Queries Overpass for `railway=station + station=subway` nodes in the Riyadh bbox (physical station positions + names).
3. Canonicalizes per-line platform nodes to the nearest named station within 500 m. This is the step that makes interchanges emerge correctly — OSM models each line's platforms as separate nodes, so without merging you get zero interchanges.
4. Applies fallback names/colors for each line by `ref` (1–6) when OSM tags are missing.
5. Writes [client/app/features/routing/data/riyadh-metro.json](../client/app/features/routing/data/riyadh-metro.json).

Re-run whenever the network changes (rarely — every few years).

### Routing algorithm

Graph: nodes are `(stationId, lineId)` tuples plus a virtual `START` and `END`. Edges:

- **Ride** (same line, adjacent stations) — 2 min.
- **Transfer** (same station, different line) — 3 min.
- **Walk from start** — haversine × 1.3 detour × 12 min/km, to each of the 3 nearest stations.
- **Walk to end** — same, from the 3 nearest stations to the destination.

Dijkstra finds the shortest path; consecutive same-line hops are collapsed into a single `TrainLeg` with sliced line geometry. If the best start or end walk exceeds 2 km, the planner returns `{ kind: 'no-route', nearestStationKm }` and the UI surfaces the empty state.

### Tunables

All in [transitRouting.ts](../client/app/features/routing/services/transitRouting.ts):

| Constant | Value | Notes |
|---|---|---|
| `WALK_SPEED_KMH` | 5 | 5 km/h = 12 min/km |
| `WALK_DETOUR` | 1.3 | crow-flight → street distance |
| `PER_STOP_MIN` | 2 | time per station hop |
| `TRANSFER_MIN` | 3 | time per line change |
| `MAX_WALK_KM` | 2.0 | beyond this, no metro route |
| `CANDIDATE_STATIONS` | 3 | K-nearest at each endpoint |

## Verification

- **Typecheck** — `npx tsc --noEmit` (clean).
- **Unit tests** — `npx vitest run tests/unit/routing/transitRouting.test.ts` (7 tests covering graph construction, Dijkstra shortest path, transfers, and the 2 km no-route threshold).
- **Manual** — enter KSU → KAFD, switch to 🚇 Metro. Expect a walk → Blue Line → walk plan. Enter a destination in far-south Riyadh for the no-route empty state. Toggle to Arabic to verify RTL + localized line names.

## Known limitations

- 11 stations on the far-south Blue Line extension are unnamed in OSM; they render with their internal ID until tagged upstream.
- Walking distances and speeds are approximations — no sidewalk-aware routing.
- No live service status (planned closures, delays).
