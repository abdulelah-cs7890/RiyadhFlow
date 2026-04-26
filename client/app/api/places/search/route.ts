import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

interface DbRow {
  id: string
  name: string
  name_ar: string | null
  address: string
  address_ar: string | null
  lng: number
  lat: number
}

const FUZZY_THRESHOLD = 0.3

function parseCoord(v: string | null, min: number, max: number): number | null {
  if (v === null) return null
  const n = Number(v)
  if (!Number.isFinite(n) || n < min || n > max) return null
  return n
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const q = (sp.get('q') ?? '').trim()
  if (q.length < 2) return NextResponse.json([])

  const like = `%${q}%`
  const prefix = `${q}%`
  const lat = parseCoord(sp.get('lat'), -90, 90)
  const lng = parseCoord(sp.get('lng'), -180, 180)

  if (lat !== null && lng !== null) {
    const rows = await prisma.$queryRaw<DbRow[]>(Prisma.sql`
      WITH matches AS (
        SELECT id, name, name_ar, address, address_ar,
          ST_X(location::geometry) AS lng,
          ST_Y(location::geometry) AS lat,
          CASE
            WHEN name ILIKE ${prefix} OR name_ar ILIKE ${prefix} THEN 0
            WHEN name ILIKE ${like} OR name_ar ILIKE ${like} THEN 1
            ELSE 2
          END AS match_rank,
          GREATEST(similarity(name, ${q}), COALESCE(similarity(name_ar, ${q}), 0)) AS sim,
          location <-> ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326) AS dist
        FROM places
        WHERE name ILIKE ${like}
           OR name_ar ILIKE ${like}
           OR similarity(name, ${q}) > ${FUZZY_THRESHOLD}
           OR (name_ar IS NOT NULL AND similarity(name_ar, ${q}) > ${FUZZY_THRESHOLD})
      ),
      collapsed AS (
        SELECT *,
          ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY dist) AS rn
        FROM matches
      )
      SELECT id, name, name_ar, address, address_ar, lng, lat
      FROM collapsed
      WHERE rn = 1
      ORDER BY match_rank, dist, sim DESC, length(name)
      LIMIT 8
    `)
    return NextResponse.json(rows)
  }

  const rows = await prisma.$queryRaw<DbRow[]>(Prisma.sql`
    SELECT id, name, name_ar, address, address_ar,
      ST_X(location::geometry) AS lng,
      ST_Y(location::geometry) AS lat
    FROM places
    WHERE name ILIKE ${like}
       OR name_ar ILIKE ${like}
       OR similarity(name, ${q}) > ${FUZZY_THRESHOLD}
       OR (name_ar IS NOT NULL AND similarity(name_ar, ${q}) > ${FUZZY_THRESHOLD})
    ORDER BY
      CASE
        WHEN name ILIKE ${prefix} OR name_ar ILIKE ${prefix} THEN 0
        WHEN name ILIKE ${like} OR name_ar ILIKE ${like} THEN 1
        ELSE 2
      END,
      GREATEST(similarity(name, ${q}), COALESCE(similarity(name_ar, ${q}), 0)) DESC,
      length(name)
    LIMIT 8
  `)
  return NextResponse.json(rows)
}
