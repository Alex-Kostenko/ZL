-- CreateEnum
CREATE TYPE "attribute_type" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'RANGE');

-- CreateEnum
CREATE TYPE "attribute_source" AS ENUM ('MANUAL', 'TRIA', 'SUPPLIER_FEED', 'IMPORT');

-- CreateTable
CREATE TABLE "attributes" (
    "id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "type" "attribute_type" NOT NULL,
    "is_filterable" BOOLEAN NOT NULL DEFAULT false,
    "is_searchable" BOOLEAN NOT NULL DEFAULT false,
    "is_variant_option" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "external_id" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attribute_translations" (
    "attribute_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "unit" VARCHAR(50),

    CONSTRAINT "attribute_translations_pkey" PRIMARY KEY ("attribute_id","locale")
);

-- CreateTable
CREATE TABLE "attribute_values" (
    "id" UUID NOT NULL,
    "attribute_id" UUID NOT NULL,
    "code" VARCHAR(150) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "external_id" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attribute_value_translations" (
    "attribute_value_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "label" VARCHAR(255) NOT NULL,

    CONSTRAINT "attribute_value_translations_pkey" PRIMARY KEY ("attribute_value_id","locale")
);

-- CreateTable
CREATE TABLE "category_attributes" (
    "category_id" UUID NOT NULL,
    "attribute_id" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_filterable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "category_attributes_pkey" PRIMARY KEY ("category_id","attribute_id")
);

-- CreateTable
CREATE TABLE "product_attribute_values" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "attribute_id" UUID NOT NULL,
    "value_id" UUID,
    "value_number" DECIMAL(14,4),
    "value_number_to" DECIMAL(14,4),
    "value_boolean" BOOLEAN,
    "value_text" VARCHAR(1000),
    "source" "attribute_source" NOT NULL DEFAULT 'MANUAL',
    "source_external_id" VARCHAR(100),
    "source_updated_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attributes_code_key" ON "attributes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "attributes_external_id_key" ON "attributes"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "attribute_values_external_id_key" ON "attribute_values"("external_id");

-- CreateIndex
CREATE INDEX "attribute_values_attribute_id_position_idx" ON "attribute_values"("attribute_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "attribute_values_attribute_id_code_key" ON "attribute_values"("attribute_id", "code");

-- CreateIndex
CREATE INDEX "category_attributes_attribute_id_idx" ON "category_attributes"("attribute_id");

-- CreateIndex
CREATE INDEX "product_attribute_values_product_id_attribute_id_idx" ON "product_attribute_values"("product_id", "attribute_id");

-- CreateIndex
CREATE INDEX "product_attribute_values_variant_id_idx" ON "product_attribute_values"("variant_id");

-- CreateIndex
CREATE INDEX "product_attribute_values_attribute_id_value_id_idx" ON "product_attribute_values"("attribute_id", "value_id");

-- CreateIndex
CREATE INDEX "product_attribute_values_attribute_id_value_number_idx" ON "product_attribute_values"("attribute_id", "value_number");

-- AddForeignKey
ALTER TABLE "attribute_translations" ADD CONSTRAINT "attribute_translations_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribute_translations" ADD CONSTRAINT "attribute_translations_locale_fkey" FOREIGN KEY ("locale") REFERENCES "locales"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribute_values" ADD CONSTRAINT "attribute_values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribute_value_translations" ADD CONSTRAINT "attribute_value_translations_attribute_value_id_fkey" FOREIGN KEY ("attribute_value_id") REFERENCES "attribute_values"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribute_value_translations" ADD CONSTRAINT "attribute_value_translations_locale_fkey" FOREIGN KEY ("locale") REFERENCES "locales"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_attributes" ADD CONSTRAINT "category_attributes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_attributes" ADD CONSTRAINT "category_attributes_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "attributes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "attributes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_value_id_fkey" FOREIGN KEY ("value_id") REFERENCES "attribute_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
