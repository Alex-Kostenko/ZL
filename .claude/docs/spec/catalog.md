# Каталог: категорії, товари, варіанти, атрибути, бренди, ціни, склад, пошук, імпорт, локалізація

> Фрагмент ТЗ «Мисливська лавка» v1.0. Номери розділів збережено (§N).

## 5. Каталог

Каталог повинен підтримувати щонайменше **50 000 товарів** без зміни
архітектури.

Категорії повинні підтримувати необмежену вкладеність на рівні моделі
даних.

### Category

``` text
id
parentId
name
slug
description
image
icon
position
isActive
seoTitle
seoDescription
canonical
createdAt
updatedAt
```

## 6. Product

Product є центральною сутністю каталогу.

``` text
id
externalId
sku
slug
title
shortDescription
description
brandId
status
isPublished
isSale
isAntidron
createdAt
updatedAt
publishedAt
```

### Спеціальні ознаки

`isSale` та `isAntidron` --- **ознаки товару, а не категорії**.

Вони формують окремі вітринні сторінки:

``` text
/sale
/antidron
```

Ці сторінки не мають власної category hierarchy.

## 7. Product Variants

Архітектура повинна підтримувати:

``` text
Product
├── Variant
├── Variant
└── Variant
```

### Variant

``` text
id
productId
sku
externalId
barcode
weight
dimensions
status
```

Ціни та залишки бажано тримати в окремих доменних моделях, а не
дублювати як єдине джерело істини у Variant.

## 8. Attributes

Характеристики не повинні зберігатися одним неструктурованим JSON-полем
Product.

### Attribute

``` text
id
name
code
type
unit
filterable
searchable
```

Типи:

``` text
string
number
boolean
select
multi-select
range
```

Категорії повинні визначати доступні attributes.

## 9. Brands

``` text
id
name
slug
logo
description
country
website
isActive
seoTitle
seoDescription
```

Для бренду повинна існувати SEO-сторінка:

``` text
/brand/[slug]
```

## 10. Pricing

Pricing є окремим доменом.

Необхідно підтримувати:

``` text
price
oldPrice
salePrice
currency
validFrom
validTo
```

Архітектура повинна дозволяти додати:

-   retail price;
-   wholesale price;
-   dealer price;
-   VIP price.

## 11. Inventory

### Warehouse

``` text
id
externalId
name
```

### Inventory

``` text
productVariantId
warehouseId
quantity
reserved
available
updatedAt
```

Логіка:

``` text
available = quantity - reserved
```

Не використовувати одне глобальне `product.stock` як єдину модель
складського обліку.

## 12. Search

Використовувати окремий search engine.

Початковий вибір: **Meilisearch**.

Індексувати:

-   title;
-   SKU;
-   brand;
-   category;
-   description;
-   attributes;
-   price;
-   availability.

Підтримувати:

-   typo tolerance;
-   autocomplete;
-   facets;
-   filters;
-   sorting;
-   price ranges;
-   category filters;
-   brand filters;
-   attribute filters.

## 58. Import / Export

Admin повинен підтримувати:

-   CSV;
-   XLSX.

Для великих import:

``` text
upload
 ↓
background job
 ↓
validation
 ↓
preview/report
 ↓
import
 ↓
result report
```

Не обробляти десятки тисяч рядків одним довгим HTTP request.

## 59. Localization

Система повинна підтримувати:

``` text
uk — українська, основна мова
ru — російська
en — англійська
```

Українська є default locale.

Data model не повинен використовувати підхід:

``` text
titleUk
titleRu
titleEn
```

Використовувати масштабовану translation model.

Приклад:

``` text
products
└── product_translations
    ├── productId
    ├── locale
    ├── title
    ├── shortDescription
    └── description
```

Аналогічний pattern використовувати для:

-   categories;
-   brands, якщо контент бренду локалізується;
-   attributes та attribute values;
-   CMS pages;
-   blog;
-   banners;
-   menus;
-   landing pages;
-   SEO metadata.

Архітектура повинна дозволяти додавання нових locale без зміни основної
database schema.
