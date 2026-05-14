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

Graph nodes are `(stationId, arrivedViaLineId)` tuples — **not** bare stations. The line component matters because it's the only way the algorithm knows whether the next hop incurs a transfer or not. From `(Olaya, Blue)` to `(Olaya, Red)` is a 3-minute transfer; from `(Olaya, Blue)` to `(KAFD, Blue)` is just a ride. Without the line in the state, every visit to a multi-line station would either falsely add a transfer or falsely skip one.

Edges:

- **Ride** — same line, adjacent stations in the line's stationIds list: 2 min.
- **Transfer** — only emitted when `station.lineIds.length > 1`. Skipping this check on single-line stations is what keeps Riyadh's 73 single-line stations from generating spurious transfer edges that Dijkstra would have to enumerate.
- **Walk from start / walk to end** — to/from each of the K nearest stations (`CANDIDATE_STATIONS = 3`). Time = `haversine_km × WALK_DETOUR × (60 / WALK_SPEED_KMH)`.

**Why K=3 and not K=1?** The closest station isn't always the best boarding point. A station 600 m away on the Red Line can beat a station 400 m away on the Yellow Line if your destination is also on the Red Line — the second walk saves you a 3-minute transfer plus several stops. K=3 captures that trade-off without blowing up runtime; in practice K=5+ has produced no different itineraries on test routes.

**Geometry slicing.** When the path is reconstructed, consecutive same-line hops collapse into one `TrainLeg`. The leg's drawn polyline isn't the full line geometry — it's a slice. We project the board and alight stations onto the OSM line's vertex list by nearest-vertex, slice between those indices, then prepend the board station's exact coordinate and append the alight station's exact coordinate. The projection step is necessary because OSM line geometries don't pass cleanly through station nodes — they're sampled along the tracks at irregular intervals.

If the best start or end walk exceeds `MAX_WALK_KM`, the planner returns `{ kind: 'no-route', nearestStationKm }` and the UI surfaces the empty state instead of recommending a 20-minute slog.

### Tunables

All in [transitRouting.ts](../client/app/features/routing/services/transitRouting.ts):

| Constant | Value | Why this value |
|---|---|---|
| `WALK_SPEED_KMH` | 5 | Average urban pedestrian; matches Google Maps' default |
| `WALK_DETOUR` | 1.3 | Haversine → on-street multiplier; accounts for grid block routing |
| `PER_STOP_MIN` | 2 | Riyadh Metro 90s dwell + ~30s acceleration between adjacent stations |
| `TRANSFER_MIN` | 3 | Platform-to-platform on the longest interchange (King Abdullah) |
| `MAX_WALK_KM` | 2.0 | Beyond this, the planner reports `no-route` instead of recommending a 20-minute walk |
| `CANDIDATE_STATIONS` | 3 | Smallest K that still admits "skip the closest station for a faster line"; K=5+ produced no different itineraries on test routes |

## Verification

- **Typecheck** — `npx tsc --noEmit` (clean).
- **Unit tests** — `npx vitest run tests/unit/routing/transitRouting.test.ts` (7 tests covering graph construction, Dijkstra shortest path, transfers, and the 2 km no-route threshold).
- **Manual** — enter KSU → KAFD, switch to 🚇 Metro. Expect a walk → Blue Line → walk plan. Enter a destination in far-south Riyadh for the no-route empty state. Toggle to Arabic to verify RTL + localized line names.

## What I'd improve next

- **Real walking distances from Mapbox Directions** instead of `haversine × 1.3`. The detour multiplier is a heuristic; in superblocks or near highways the real walk is much longer. The cost: one extra Mapbox call per candidate station per endpoint = 6 calls per planning request.
- **Time-of-day-aware dwell** — `PER_STOP_MIN` is constant today. Riyadh Metro has rush-hour throughput differences worth ±30 s per stop.
- **Multi-modal: drive-to-station then metro** — common in Saudi commuting (large parking lots adjacent to terminal stations). The graph would gain `(parkingStation, 'park')` edges with a fixed parking-fee cost.
- **User-tunable transfer penalty** — some users hate transfers more than walking; a slider that scales `TRANSFER_MIN` between 1 and 8 would surface that preference.

## Known limitations

- 11 stations on the far-south Blue Line extension are unnamed in OSM; they render with their internal ID until tagged upstream.
- Walking distances and speeds are approximations — no sidewalk-aware routing.
- No live service status (planned closures, delays).
