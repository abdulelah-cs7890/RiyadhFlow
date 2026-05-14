# Place search

Place lookup in RiyadhFlow has three sources stitched together: Postgres exact (prefix + substring), Postgres fuzzy (trigram similarity), and the Mapbox Searchbox API. This doc explains the Postgres half — the part that's actually interesting.

## The constraint

The search box needs to satisfy five properties at once:

1. **Bilingual.** "King Saud University" and "جامعة الملك سعود" must both find the same row.
2. **Typo-tolerant.** "Kingdom Towr" should still return Kingdom Tower.
3. **Distance-aware** when the user's location is known — a nearer match should outrank a farther one of equal text quality.
4. **Fast enough for keystroke autocomplete.** Sub-150 ms p99 on the seeded dataset.
5. **Deduped across English/Arabic.** A row with both `name = "King Saud University"` and `name_ar = "جامعة الملك سعود"` must appear once, not twice.

A naïve `WHERE name ILIKE '%q%'` gets you (1) and (2) but kills (3), (4), and (5). The query at [app/api/places/search/route.ts](../client/app/api/places/search/route.ts) is what handles all five.

## Schema

[`schema.prisma`](../client/prisma/schema.prisma) declares `location Unsupported("geometry(Point, 4326)")` with the `postgis` and `pg_trgm` extensions enabled. Migration `20260430041500_add_search_indexes` ([migrations/](../client/prisma/migrations/)) adds three indexes that everything else depends on:

- `places_name_trgm_idx` — `GIN(name gin_trgm_ops)`
- `places_name_ar_trgm_idx` — `GIN(name_ar gin_trgm_ops)`
- `places_location_gist` — `GIST(location)` for `ST_DWithin` and the KNN `<->` operator

Without these the queries fall back to sequential scan and become unusable past a few thousand rows.

## The 3-tier fallback

The query at [search/route.ts:35–63](../client/app/api/places/search/route.ts#L35-L63) is two CTEs. First, **matches** computes everything we'll order by:

```sql
CASE
  WHEN name ILIKE 'q%' OR name_ar ILIKE 'q%' THEN 0  -- prefix
  WHEN name ILIKE '%q%' OR name_ar ILIKE '%q%' THEN 1 -- substring
  ELSE 2                                              -- fuzzy
END AS match_rank,
GREATEST(similarity(name, q), COALESCE(similarity(name_ar, q), 0)) AS sim,
location <-> ST_SetSRID(ST_MakePoint(lng, lat), 4326) AS dist
```

Rank 0 is what almost always wins because typing "kin" should immediately surface "Kingdom Tower" — typing the *start* of a name signals intent more strongly than a substring buried in the middle. Rank 1 catches misspelled or partially-remembered names ("…Tower"). Rank 2 is the typo lane: `similarity()` from `pg_trgm` compares the trigram fingerprint of the query against the indexed column, with a 0.3 threshold ([search/route.ts:15](../client/app/api/places/search/route.ts#L15)).

The `<->` operator deserves a mention — it's the PostGIS KNN distance operator and uses the GIST index to return rows in order without a full distance scan. We're not using `ST_Distance` here because the GIST index can't accelerate that; `<->` is the fast path.

Second, **collapsed** dedupes:

```sql
ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY dist) AS rn
```

Two rows with the same English name but different metadata (e.g., bilingual duplicates from separate imports) collapse to one — we keep the closer one. Without this the user sees the same place twice.

Final ordering: `match_rank ASC, dist ASC, sim DESC, length(name) ASC`. The last tiebreaker — shorter name wins — is a small but useful heuristic: "King Saud" beats "King Saud University Hospital Building 7" when both rank equally.

## Why pg_trgm instead of `LIKE '%q%'`

`LIKE '%q%'` is unindexable; it always seq-scans. `similarity(name, q) > 0.3` against a `GIN(gin_trgm_ops)` index can short-circuit via the index. On a seeded dataset of ~12k places, this is the difference between 8 ms and 200 ms p99.

## `/api/places` (category-by-distance)

The sibling endpoint at [api/places/route.ts](../client/app/api/places/route.ts) is simpler — no fuzzy match, just `ST_DWithin` to filter and `ST_Distance` to order. Radius defaults to 5 km, hard-capped at 50 km. The GIST index on `location` makes `ST_DWithin` a constant-time filter regardless of table size; without it this endpoint would seq-scan every category change.

## Trade-offs considered and rejected

- **Pure Mapbox Searchbox** — drops control over the dataset. Mapbox doesn't know that the unnamed building three blocks south of KAFD is a prayer room, but our OSM-extracted POI table does.
- **Elasticsearch / Meilisearch** — overkill for thousands of rows; another service to host. The GIN trigram index gets us 90% of the way for free.
- **Full-text search (`tsvector` + `to_tsquery`)** — better for sentence-style queries. Worse for single-word place-name lookups where typo tolerance and prefix bias matter more than stemming.

## What I'd improve next

- **Personalized rank** — boost places the user has previously selected (already tracked in `useSearchHistory`).
- **Phonetic match** — common Saudi place names have many transliterations ("Al Faisaliah" vs "Al Faisaliyah"). A `metaphone()` lane between substring and fuzzy would catch those.
- **Server-side proximity rerank for Mapbox results** — currently merged client-side, which means a closer Mapbox result can still appear after a farther DB result if the merge order is wrong.
