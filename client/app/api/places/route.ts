import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

interface PlaceRow {
  id: string
  name: string
  name_ar: string | null
  type: string
  type_ar: string | null
  category: string
  address: string
  address_ar: string | null
  about: string | null
  about_ar: string | null
  image_url: string | null
  rating: number | null
  reviews: number | null
  lng: number
  lat: number
  distance_m: number | null
}

const VALID_CATEGORIES = new Set([
  'RESTAURANTS', 'HOTELS', 'THINGS_TO_DO', 'MUSEUMS',
  'TRANSIT', 'PHARMACIES', 'GYMS',
  'MOSQUES', 'PARKING', 'GAS_STATIONS', 'MALLS',
])

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const category = sp.get('category')
  const latParam = sp.get('lat')
  const lngParam = sp.get('lng')
  const radius = Math.min(Number(sp.get('radius') ?? '5000'), 50000)

  if (category && !VALID_CATEGORIES.has(category)) {
    return NextResponse.json({ error: 'invalid category' }, { status: 400 })
  }

  const hasPoint = latParam && lngParam && !Number.isNaN(Number(latParam)) && !Number.isNaN(Number(lngParam))

  const categoryFilter = category
    ? Prisma.sql`AND category::text = ${category}`
    : Prisma.empty

  if (hasPoint) {
    const lat = Number(latParam)
    const lng = Number(lngParam)
    const rows = await prisma.$queryRaw<PlaceRow[]>`
      SELECT
        id, name, name_ar, type, type_ar, category::text AS category,
        address, address_ar, about, about_ar, image_url, rating, reviews,
        ST_X(location::geometry) AS lng,
        ST_Y(location::geometry) AS lat,
        ST_Distance(
          location::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        ) AS distance_m
      FROM places
      WHERE ST_DWithin(
        location::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radius}
      )
      ${categoryFilter}
      ORDER BY distance_m ASC
      LIMIT 50
    `
    return NextResponse.json(rows)
  }

  const rows = await prisma.$queryRaw<PlaceRow[]>`
    SELECT
      id, name, name_ar, type, type_ar, category::text AS category,
      address, address_ar, about, about_ar, image_url, rating, reviews,
      ST_X(location::geometry) AS lng,
      ST_Y(location::geometry) AS lat,
      NULL::float AS distance_m
    FROM places
    WHERE TRUE
    ${categoryFilter}
    ORDER BY name ASC
    LIMIT 100
  `
  return NextResponse.json(rows)
}
