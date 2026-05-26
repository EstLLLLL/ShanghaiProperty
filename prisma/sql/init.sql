-- CreateEnum
CREATE TYPE "PropertySource" AS ENUM ('AMAP', 'FANGDI', 'MANUAL');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('NEW', 'SECONDHAND', 'BOTH');

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "source" "PropertySource" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PropertyType" NOT NULL DEFAULT 'BOTH',
    "developer" TEXT,
    "propertyCompany" TEXT,
    "address" TEXT,
    "district" TEXT,
    "lng" DOUBLE PRECISION NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "phone" TEXT,
    "yearBuilt" INTEGER,
    "plotRatio" DOUBLE PRECISION,
    "greenRatio" DOUBLE PRECISION,
    "deliveryDate" TIMESTAMP(3),
    "lianjiaUrl" TEXT,
    "manualUnitPrice" DOUBLE PRECISION,
    "manualPriceUpdatedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "new_house_batches" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "presaleLicense" TEXT,
    "batchName" TEXT,
    "totalUnits" INTEGER,
    "soldUnits" INTEGER,
    "avgPrice" DOUBLE PRECISION,
    "priceRangeMin" DOUBLE PRECISION,
    "priceRangeMax" DOUBLE PRECISION,
    "openDate" TIMESTAMP(3),
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceUrl" TEXT,

    CONSTRAINT "new_house_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "house_types" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "rooms" TEXT,
    "area" DOUBLE PRECISION,
    "orientation" TEXT,
    "totalPriceEst" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "house_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL,
    "overallRating" INTEGER,
    "locationRating" INTEGER,
    "layoutRating" INTEGER,
    "priceRating" INTEGER,
    "propertyMgmtRating" INTEGER,
    "salesAttitudeRating" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_photos" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,

    CONSTRAINT "visit_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_tags" (
    "propertyId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "property_tags_pkey" PRIMARY KEY ("propertyId","tagId")
);

-- CreateIndex
CREATE INDEX "properties_district_idx" ON "properties"("district");

-- CreateIndex
CREATE INDEX "properties_type_idx" ON "properties"("type");

-- CreateIndex
CREATE INDEX "properties_lng_lat_idx" ON "properties"("lng", "lat");

-- CreateIndex
CREATE UNIQUE INDEX "properties_source_sourceId_key" ON "properties"("source", "sourceId");

-- CreateIndex
CREATE INDEX "new_house_batches_propertyId_idx" ON "new_house_batches"("propertyId");

-- CreateIndex
CREATE INDEX "house_types_propertyId_idx" ON "house_types"("propertyId");

-- CreateIndex
CREATE INDEX "visits_propertyId_idx" ON "visits"("propertyId");

-- CreateIndex
CREATE INDEX "visits_visitedAt_idx" ON "visits"("visitedAt");

-- CreateIndex
CREATE INDEX "visit_photos_visitId_idx" ON "visit_photos"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- AddForeignKey
ALTER TABLE "new_house_batches" ADD CONSTRAINT "new_house_batches_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "house_types" ADD CONSTRAINT "house_types_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_photos" ADD CONSTRAINT "visit_photos_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_tags" ADD CONSTRAINT "property_tags_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_tags" ADD CONSTRAINT "property_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

