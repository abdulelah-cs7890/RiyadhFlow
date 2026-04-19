import { PrismaClient } from '@prisma/client'
import { mockCategoryData, CATEGORY_LABELS, type Category } from '../app/utils/mockData'

const prisma = new PrismaClient()

const CATEGORY_ENUM: Record<Category, string> = {
  'Restaurants': 'RESTAURANTS',
  'Hotels': 'HOTELS',
  'Things to do': 'THINGS_TO_DO',
  'Museums': 'MUSEUMS',
  'Transit': 'TRANSIT',
  'Pharmacies': 'PHARMACIES',
  'Gyms': 'GYMS',
}

async function main() {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE places RESTART IDENTITY')

  let count = 0
  for (const cat of CATEGORY_LABELS) {
    for (const p of mockCategoryData[cat]) {
      const [lng, lat] = p.coords
      await prisma.$executeRaw`
        INSERT INTO places (
          id, name, name_ar, type, type_ar, category,
          address, address_ar, about, about_ar,
          image_url, rating, reviews, location, created_at
        )
        VALUES (
          gen_random_uuid()::text,
          ${p.name}, ${p.name_ar ?? null},
          ${p.type}, ${p.type_ar ?? null},
          ${CATEGORY_ENUM[cat]}::"category",
          ${p.address}, ${p.address_ar ?? null},
          ${p.about ?? null}, ${p.about_ar ?? null},
          ${p.image ?? null},
          ${p.rating ?? null}, ${p.reviews ?? null},
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
          NOW()
        )
      `
      count++
    }
  }
  console.log(`Seeded ${count} places`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
