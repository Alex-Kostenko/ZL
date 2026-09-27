# ERD — схема бази даних

> Згенеровано з живої схеми PostgreSQL командою `npm run db:erd` — не редагувати вручну.
> Джерело правди — `apps/api/prisma/schema.prisma` і міграції. PK/FK/UK — ключі; `generated` — обчислювана колонка.

## Звʼязки між усіма таблицями

```mermaid
erDiagram
  attributes ||--o{ attribute_translations : "attribute_id"
  locales ||--o{ attribute_translations : "locale"
  attribute_values ||--o{ attribute_value_translations : "attribute_value_id"
  locales ||--o{ attribute_value_translations : "locale"
  attributes ||--o{ attribute_values : "attribute_id"
  brands ||--o{ brand_translations : "brand_id"
  locales ||--o{ brand_translations : "locale"
  media |o--o{ brands : "logo_id"
  media |o--o{ categories : "image_id"
  categories |o--o{ categories : "parent_id"
  attributes ||--o{ category_attributes : "attribute_id"
  categories ||--o{ category_attributes : "category_id"
  categories ||--o{ category_translations : "category_id"
  locales ||--o{ category_translations : "locale"
  product_variants ||--o{ inventory : "variant_id"
  warehouses ||--o{ inventory : "warehouse_id"
  locales ||--o{ media_translations : "locale"
  media ||--o{ media_translations : "media_id"
  price_types ||--o{ prices : "price_type_id"
  product_variants ||--o{ prices : "variant_id"
  attributes ||--o{ product_attribute_values : "attribute_id"
  products ||--o{ product_attribute_values : "product_id"
  attribute_values |o--o{ product_attribute_values : "value_id"
  product_variants |o--o{ product_attribute_values : "variant_id"
  categories ||--o{ product_categories : "category_id"
  products ||--o{ product_categories : "product_id"
  media ||--o{ product_media : "media_id"
  products ||--o{ product_media : "product_id"
  product_variants |o--o{ product_media : "variant_id"
  locales ||--o{ product_translations : "locale"
  products ||--o{ product_translations : "product_id"
  products ||--o{ product_variants : "product_id"
  brands |o--o{ products : "brand_id"
  categories |o--o{ products : "primary_category_id"
  locales ||--o{ seo_metadata : "locale"
  media |o--o{ seo_metadata : "og_image_id"
```

## Каталог: категорії, бренди, товари

```mermaid
erDiagram
  brands ||--o{ brand_translations : "brand_id"
  categories |o--o{ categories : "parent_id"
  categories ||--o{ category_translations : "category_id"
  categories ||--o{ product_categories : "category_id"
  products ||--o{ product_categories : "product_id"
  products ||--o{ product_translations : "product_id"
  products ||--o{ product_variants : "product_id"
  brands |o--o{ products : "brand_id"
  categories |o--o{ products : "primary_category_id"
  categories {
    uuid id PK
    uuid parent_id FK "nullable"
    character_varying slug
    character_varying path
    integer depth
    character_varying icon "nullable"
    integer position
    boolean is_active
    character_varying external_id "nullable"
    timestamp_without_time_zone created_at
    timestamp_without_time_zone updated_at
    uuid image_id FK "nullable"
  }
  category_translations {
    uuid category_id FK, PK
    character_varying locale FK, PK
    character_varying name
    text description "nullable"
  }
  brands {
    uuid id PK
    character_varying name
    character_varying slug
    character country "nullable"
    character_varying website "nullable"
    boolean is_active
    character_varying external_id "nullable"
    timestamp_without_time_zone created_at
    timestamp_without_time_zone updated_at
    uuid logo_id FK "nullable"
  }
  brand_translations {
    uuid brand_id FK, PK
    character_varying locale FK, PK
    text description "nullable"
  }
  products {
    uuid id PK
    character_varying sku
    character_varying slug
    uuid brand_id FK "nullable"
    uuid primary_category_id FK "nullable"
    product_status status
    boolean is_published
    timestamp_without_time_zone published_at "nullable"
    boolean is_sale
    boolean is_antidron
    character_varying external_id "nullable"
    timestamp_without_time_zone created_at
    timestamp_without_time_zone updated_at
  }
  product_translations {
    uuid product_id FK, PK
    character_varying locale FK, PK
    character_varying title
    text short_description "nullable"
    text description "nullable"
  }
  product_categories {
    uuid product_id FK, PK
    uuid category_id FK, PK
    integer position
  }
  product_variants {
    uuid id PK
    uuid product_id FK
    character_varying sku
    character_varying barcode "nullable"
    integer weight_g "nullable"
    integer length_mm "nullable"
    integer width_mm "nullable"
    integer height_mm "nullable"
    variant_status status
    integer position
    character_varying external_id "nullable"
    timestamp_without_time_zone created_at
    timestamp_without_time_zone updated_at
  }
```

## Атрибути

```mermaid
erDiagram
  attributes ||--o{ attribute_translations : "attribute_id"
  attribute_values ||--o{ attribute_value_translations : "attribute_value_id"
  attributes ||--o{ attribute_values : "attribute_id"
  attributes ||--o{ category_attributes : "attribute_id"
  attributes ||--o{ product_attribute_values : "attribute_id"
  attribute_values |o--o{ product_attribute_values : "value_id"
  attributes {
    uuid id PK
    character_varying code
    attribute_type type
    boolean is_filterable
    boolean is_searchable
    boolean is_variant_option
    integer position
    character_varying external_id "nullable"
    timestamp_without_time_zone created_at
    timestamp_without_time_zone updated_at
  }
  attribute_translations {
    uuid attribute_id FK, PK
    character_varying locale FK, PK
    character_varying name
    character_varying unit "nullable"
  }
  attribute_values {
    uuid id PK
    uuid attribute_id FK
    character_varying code
    integer position
    character_varying external_id "nullable"
    timestamp_without_time_zone created_at
    timestamp_without_time_zone updated_at
  }
  attribute_value_translations {
    uuid attribute_value_id FK, PK
    character_varying locale FK, PK
    character_varying label
  }
  category_attributes {
    uuid category_id FK, PK
    uuid attribute_id FK, PK
    integer position
    boolean is_required
    boolean is_filterable
  }
  product_attribute_values {
    uuid id PK
    uuid product_id FK
    uuid variant_id FK "nullable"
    uuid attribute_id FK
    uuid value_id FK "nullable"
    numeric value_number "nullable"
    numeric value_number_to "nullable"
    boolean value_boolean "nullable"
    character_varying value_text "nullable"
    attribute_source source
    character_varying source_external_id "nullable"
    timestamp_without_time_zone source_updated_at "nullable"
    timestamp_without_time_zone verified_at "nullable"
    timestamp_without_time_zone created_at
    timestamp_without_time_zone updated_at
  }
```

## Ціни, склад, медіа

```mermaid
erDiagram
  warehouses ||--o{ inventory : "warehouse_id"
  media ||--o{ media_translations : "media_id"
  price_types ||--o{ prices : "price_type_id"
  media ||--o{ product_media : "media_id"
  price_types {
    uuid id PK
    character_varying code
    character_varying name
    boolean is_default
    timestamp_without_time_zone created_at
    timestamp_without_time_zone updated_at
  }
  prices {
    uuid id PK
    uuid variant_id FK
    uuid price_type_id FK
    character currency
    numeric price
    numeric old_price "nullable"
    numeric sale_price "nullable"
    timestamp_without_time_zone valid_from "nullable"
    timestamp_without_time_zone valid_to "nullable"
    character_varying external_id "nullable"
    timestamp_without_time_zone created_at
    timestamp_without_time_zone updated_at
  }
  warehouses {
    uuid id PK
    character_varying code
    character_varying name
    boolean is_active
    integer position
    character_varying external_id "nullable"
    timestamp_without_time_zone created_at
    timestamp_without_time_zone updated_at
  }
  inventory {
    uuid variant_id FK, PK
    uuid warehouse_id FK, PK
    integer quantity
    integer reserved
    integer available "generated"
    timestamp_without_time_zone updated_at
  }
  media {
    uuid id PK
    character_varying key
    character_varying filename
    character_varying mime_type
    integer width "nullable"
    integer height "nullable"
    integer size_bytes
    timestamp_without_time_zone created_at
    timestamp_without_time_zone updated_at
  }
  media_translations {
    uuid media_id FK, PK
    character_varying locale FK, PK
    character_varying alt "nullable"
    character_varying title "nullable"
  }
  product_media {
    uuid product_id FK, PK
    uuid media_id FK, PK
    uuid variant_id FK "nullable"
    integer position
    boolean is_primary
  }
```

## SEO, редиректи, інтеграції, службові

```mermaid
erDiagram
  locales ||--o{ seo_metadata : "locale"
  locales {
    character_varying code PK
    text name
    boolean is_default
    boolean is_active
    integer position
  }
  seo_metadata {
    uuid id PK
    seo_entity_type entity_type
    character_varying entity_id
    character_varying locale FK
    character_varying title "nullable"
    character_varying description "nullable"
    character_varying canonical "nullable"
    boolean noindex
    boolean nofollow
    character_varying og_title "nullable"
    character_varying og_description "nullable"
    uuid og_image_id FK "nullable"
    timestamp_without_time_zone created_at
    timestamp_without_time_zone updated_at
  }
  redirects {
    uuid id PK
    character_varying from_path
    character_varying to_path "nullable"
    integer status_code
    redirect_source source
    boolean is_active
    integer hits
    timestamp_without_time_zone last_hit_at "nullable"
    timestamp_without_time_zone created_at
    timestamp_without_time_zone updated_at
  }
  integration_mappings {
    uuid id PK
    character_varying integration
    integration_entity_type entity_type
    character_varying external_id
    uuid internal_id
    character_varying payload_hash "nullable"
    timestamp_without_time_zone last_synced_at "nullable"
    timestamp_without_time_zone created_at
    timestamp_without_time_zone updated_at
  }
  sync_logs {
    uuid id PK
    character_varying integration
    character_varying scope
    sync_trigger trigger
    sync_status status
    character_varying job_id "nullable"
    timestamp_without_time_zone started_at
    timestamp_without_time_zone finished_at "nullable"
    integer items_total
    integer items_created
    integer items_updated
    integer items_skipped
    integer items_failed
    text error_message "nullable"
    jsonb errors "nullable"
  }
  settings {
    text key PK
    jsonb value
    timestamp_without_time_zone updated_at
    timestamp_without_time_zone created_at
  }
```
