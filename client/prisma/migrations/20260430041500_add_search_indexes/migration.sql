-- Add the missing pg_trgm GIN indexes for fuzzy /api/places/search.
-- The earlier 20260419223116_add_pg_trgm migration installed the extension
-- and dropped the existing GIST geometry index but never added the trigram
-- indexes that similarity()-based search needs. Restore both here.

CREATE INDEX IF NOT EXISTS places_name_trgm_idx
  ON places USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS places_name_ar_trgm_idx
  ON places USING GIN (name_ar gin_trgm_ops);

-- Restore the GIST index on the geometry column so ST_DWithin / ST_Distance
-- in /api/places (near-me) hit a Bitmap Index Scan instead of Seq Scan.
CREATE INDEX IF NOT EXISTS places_location_gist
  ON places USING GIST (location);
