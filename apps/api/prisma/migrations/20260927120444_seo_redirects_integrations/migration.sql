/*
  Warnings:

  - You are about to drop the column `seo_description` on the `brand_translations` table. All the data in the column will be lost.
  - You are about to drop the column `seo_title` on the `brand_translations` table. All the data in the column will be lost.
  - You are about to drop the column `canonical` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `seo_description` on the `category_translations` table. All the data in the column will be lost.
  - You are about to drop the column `seo_title` on the `category_translations` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "seo_entity_type" AS ENUM ('PRODUCT', 'CATEGORY', 'BRAND', 'PAGE', 'ARTICLE', 'ROUTE');

-- CreateEnum
CREATE TYPE "redirect_source" AS ENUM ('MANUAL', 'SLUG_CHANGE', 'IMPORT');

-- CreateEnum
CREATE TYPE "integration_entity_type" AS ENUM ('PRODUCT', 'VARIANT', 'CATEGORY', 'BRAND', 'WAREHOUSE', 'PRICE_TYPE', 'PRICE', 'ATTRIBUTE', 'ATTRIBUTE_VALUE', 'ORDER', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "sync_trigger" AS ENUM ('SCHEDULED', 'MANUAL', 'RETRY');

-- CreateEnum
CREATE TYPE "sync_status" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- AlterTable
ALTER TABLE "brand_translations" DROP COLUMN "seo_description",
DROP COLUMN "seo_title";

-- AlterTable
ALTER TABLE "categories" DROP COLUMN "canonical";

-- AlterTable
ALTER TABLE "category_translations" DROP COLUMN "seo_description",
DROP COLUMN "seo_title";

-- CreateTable
CREATE TABLE "seo_metadata" (
    "id" UUID NOT NULL,
    "entity_type" "seo_entity_type" NOT NULL,
    "entity_id" VARCHAR(255) NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "title" VARCHAR(255),
    "description" VARCHAR(500),
    "canonical" VARCHAR(1000),
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "nofollow" BOOLEAN NOT NULL DEFAULT false,
    "og_title" VARCHAR(255),
    "og_description" VARCHAR(500),
    "og_image_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redirects" (
    "id" UUID NOT NULL,
    "from_path" VARCHAR(1000) NOT NULL,
    "to_path" VARCHAR(1000),
    "status_code" INTEGER NOT NULL DEFAULT 301,
    "source" "redirect_source" NOT NULL DEFAULT 'MANUAL',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "last_hit_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redirects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_mappings" (
    "id" UUID NOT NULL,
    "integration" VARCHAR(50) NOT NULL,
    "entity_type" "integration_entity_type" NOT NULL,
    "external_id" VARCHAR(255) NOT NULL,
    "internal_id" UUID NOT NULL,
    "payload_hash" VARCHAR(64),
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" UUID NOT NULL,
    "integration" VARCHAR(50) NOT NULL,
    "scope" VARCHAR(50) NOT NULL,
    "trigger" "sync_trigger" NOT NULL,
    "status" "sync_status" NOT NULL DEFAULT 'RUNNING',
    "job_id" VARCHAR(255),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "items_total" INTEGER NOT NULL DEFAULT 0,
    "items_created" INTEGER NOT NULL DEFAULT 0,
    "items_updated" INTEGER NOT NULL DEFAULT 0,
    "items_skipped" INTEGER NOT NULL DEFAULT 0,
    "items_failed" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "errors" JSONB,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seo_metadata_entity_type_entity_id_locale_key" ON "seo_metadata"("entity_type", "entity_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "redirects_from_path_key" ON "redirects"("from_path");

-- CreateIndex
CREATE INDEX "redirects_to_path_idx" ON "redirects"("to_path");

-- CreateIndex
CREATE INDEX "integration_mappings_entity_type_internal_id_idx" ON "integration_mappings"("entity_type", "internal_id");

-- CreateIndex
CREATE UNIQUE INDEX "integration_mappings_integration_entity_type_external_id_key" ON "integration_mappings"("integration", "entity_type", "external_id");

-- CreateIndex
CREATE INDEX "sync_logs_integration_scope_started_at_idx" ON "sync_logs"("integration", "scope", "started_at" DESC);

-- CreateIndex
CREATE INDEX "sync_logs_status_idx" ON "sync_logs"("status");

-- AddForeignKey
ALTER TABLE "seo_metadata" ADD CONSTRAINT "seo_metadata_locale_fkey" FOREIGN KEY ("locale") REFERENCES "locales"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_metadata" ADD CONSTRAINT "seo_metadata_og_image_id_fkey" FOREIGN KEY ("og_image_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Hand-written: not expressible in Prisma schema ───────────────────────────

-- 301/302 need a target; 410 Gone has none; never redirect a path to itself.
ALTER TABLE "redirects"
  ADD CONSTRAINT "redirects_status_chk" CHECK ("status_code" IN (301, 302, 410)),
  ADD CONSTRAINT "redirects_target_chk" CHECK (("status_code" = 410) = ("to_path" IS NULL)),
  ADD CONSTRAINT "redirects_self_chk" CHECK ("to_path" IS NULL OR "to_path" <> "from_path");
