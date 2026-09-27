-- AlterTable
ALTER TABLE "brands" ADD COLUMN     "logo_id" UUID;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "image_id" UUID;

-- CreateTable
CREATE TABLE "warehouses" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "external_id" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "variant_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "available" INTEGER NOT NULL GENERATED ALWAYS AS ("quantity" - "reserved") STORED,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("variant_id","warehouse_id")
);

-- CreateTable
CREATE TABLE "price_types" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prices" (
    "id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "price_type_id" UUID NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'UAH',
    "price" DECIMAL(12,2) NOT NULL,
    "old_price" DECIMAL(12,2),
    "sale_price" DECIMAL(12,2),
    "valid_from" TIMESTAMP(3),
    "valid_to" TIMESTAMP(3),
    "external_id" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL,
    "key" VARCHAR(500) NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_translations" (
    "media_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "alt" VARCHAR(500),
    "title" VARCHAR(255),

    CONSTRAINT "media_translations_pkey" PRIMARY KEY ("media_id","locale")
);

-- CreateTable
CREATE TABLE "product_media" (
    "product_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "variant_id" UUID,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "product_media_pkey" PRIMARY KEY ("product_id","media_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_external_id_key" ON "warehouses"("external_id");

-- CreateIndex
CREATE INDEX "inventory_warehouse_id_idx" ON "inventory"("warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "price_types_code_key" ON "price_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "prices_external_id_key" ON "prices"("external_id");

-- CreateIndex
CREATE INDEX "prices_variant_id_price_type_id_currency_valid_from_idx" ON "prices"("variant_id", "price_type_id", "currency", "valid_from");

-- CreateIndex
CREATE UNIQUE INDEX "media_key_key" ON "media"("key");

-- CreateIndex
CREATE INDEX "product_media_product_id_position_idx" ON "product_media"("product_id", "position");

-- CreateIndex
CREATE INDEX "product_media_media_id_idx" ON "product_media"("media_id");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_logo_id_fkey" FOREIGN KEY ("logo_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prices" ADD CONSTRAINT "prices_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prices" ADD CONSTRAINT "prices_price_type_id_fkey" FOREIGN KEY ("price_type_id") REFERENCES "price_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_translations" ADD CONSTRAINT "media_translations_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_translations" ADD CONSTRAINT "media_translations_locale_fkey" FOREIGN KEY ("locale") REFERENCES "locales"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Hand-written: not expressible in Prisma schema ───────────────────────────

-- Stock counters are never negative (available may be, see schema comment).
ALTER TABLE "inventory"
  ADD CONSTRAINT "inventory_quantity_chk" CHECK ("quantity" >= 0),
  ADD CONSTRAINT "inventory_reserved_chk" CHECK ("reserved" >= 0);

-- Money is non-negative; a sale price never exceeds the regular price; periods are ordered.
ALTER TABLE "prices"
  ADD CONSTRAINT "prices_amounts_chk" CHECK (
    "price" >= 0 AND ("old_price" IS NULL OR "old_price" >= 0)
    AND ("sale_price" IS NULL OR ("sale_price" >= 0 AND "sale_price" <= "price"))
  ),
  ADD CONSTRAINT "prices_period_chk" CHECK (
    "valid_from" IS NULL OR "valid_to" IS NULL OR "valid_to" > "valid_from"
  );

ALTER TABLE "media"
  ADD CONSTRAINT "media_size_chk" CHECK ("size_bytes" >= 0);

-- At most one primary image per product.
CREATE UNIQUE INDEX "product_media_one_primary_idx"
  ON "product_media" ("product_id") WHERE "is_primary";

-- Reference data: the default price list (§10).
INSERT INTO "price_types" ("id", "code", "name", "is_default", "updated_at")
VALUES (gen_random_uuid(), 'retail', 'Роздрібна', true, CURRENT_TIMESTAMP);
