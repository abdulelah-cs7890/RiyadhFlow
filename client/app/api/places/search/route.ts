import { NextRequest, NextResponse } from 'next/server'
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

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const q = (sp.get('q') ?? '').trim()
  if (q.length < 2) return NextResponse.json([])

  const like = `%${q}%`
  const prefix = `${q}%`
  const rows = await prisma.$queryRaw<DbRow[]>`
    SELECT id, name, name_ar, address, address_ar,
      ST_X(location::geometry) AS lng,
      ST_Y(location::geometry) AS lat
    FROM places
    WHERE name ILIKE ${like} OR name_ar ILIKE ${like}
    ORDER BY
      CASE WHEN name ILIKE ${prefix} OR name_ar ILIKE ${prefix} THEN 0 ELSE 1 END,
      length(name)
    LIMIT 8
  `
  return NextResponse.json(rows)
}
