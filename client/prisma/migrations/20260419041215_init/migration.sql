-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "category" AS ENUM ('RESTAURANTS', 'HOTELS', 'THINGS_TO_DO', 'MUSEUMS', 'TRANSIT', 'PHARMACIES', 'GYMS');

-- CreateTable
CREATE TABLE "places" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_ar" TEXT,
    "type" TEXT NOT NULL,
    "type_ar" TEXT,
    "category" "category" NOT NULL,
    "address" TEXT NOT NULL,
    "address_ar" TEXT,
    "about" TEXT,
    "about_ar" TEXT,
    "image_url" TEXT,
    "rating" DOUBLE PRECISION,
    "reviews" INTEGER,
    "location" geometry(Point, 4326) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "places_category_idx" ON "places"("category");

-- Spatial index for ST_DWithin / ST_Distance queries
CREATE INDEX "places_location_gist" ON "places" USING GIST (location);
