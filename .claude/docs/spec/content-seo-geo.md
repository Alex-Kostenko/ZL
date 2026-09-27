# CMS, медіа, SEO, sitemap, redirects, GEO

> Фрагмент ТЗ «Мисливська лавка» v1.0. Номери розділів збережено (§N).

## 15. CMS

CMS реалізовується всередині власної Admin Panel.

Не використовувати Strapi або WordPress.

CMS управляє:

-   Pages
-   Blog
-   Banners
-   Menus
-   Footer
-   Homepage sections
-   Landing pages
-   SEO
-   Media

Контент не повинен вимагати нового deploy для публікації.

## 16. Media

Файли не зберігати у PostgreSQL.

Використовувати S3-compatible object storage.

### Media

``` text
id
filename
url
mimeType
width
height
size
alt
title
createdAt
```

Підтримувати:

-   AVIF
-   WebP
-   JPEG
-   PNG
-   SVG

Для Product:

``` text
ProductMedia
├── productId
├── mediaId
├── position
└── isPrimary
```

## 41. SEO

Підтримати:

-   title;
-   meta description;
-   canonical;
-   robots;
-   OpenGraph;
-   JSON-LD;
-   breadcrumbs;
-   sitemap;
-   robots.txt.

Для Product підтримати structured data, включаючи Product, Offer та
BreadcrumbList, де це коректно.

## 42. Sitemap

Для 50 000+ товарів використовувати sitemap index.

``` text
/sitemap.xml

/sitemaps/products-1.xml
/sitemaps/products-2.xml
/sitemaps/categories.xml
/sitemaps/brands.xml
/sitemaps/pages.xml
```

## 43. Redirects

Admin повинен дозволяти створювати:

-   301;
-   302. 

При зміні slug система повинна пропонувати redirect:

``` text
old URL → new URL
```

## 67. GEO --- Generative Engine Optimization

Сайт повинен бути оптимізований не тільки для класичних пошукових
систем, але й для коректного розуміння, індексації, використання та
цитування контенту AI/LLM-системами та AI search engines, зокрема
ChatGPT, Gemini, Perplexity та іншими generative engines.

GEO доповнює SEO, але не замінює його.

### 67.1. Основні цілі GEO

-   зробити товари, категорії, бренди та експертний контент
    машинозрозумілими;
-   забезпечити однозначне визначення сутностей;
-   підвищити ймовірність коректного використання та цитування контенту
    generative engines;
-   забезпечити доступність актуальних характеристик, цін, наявності та
    canonical URLs;
-   мінімізувати дублікати, суперечливі дані та неоднозначні описи;
-   створити структуровану базу експертного контенту про товари,
    полювання, риболовлю та активний відпочинок.

### 67.2. Crawlability та indexability

Публічний контент, який повинен бути доступний пошуковим та AI-системам,
має бути доступний у server-rendered HTML без необхідності виконувати
client-side JavaScript для отримання основного змісту.

Необхідно коректно підтримувати:

``` text
robots.txt
sitemap.xml
canonical
HTTP status codes
301 redirects
404 responses
```

Правила доступу конкретних crawler/user-agent повинні керуватися
централізовано та свідомо, а не випадково через WAF/CDN.

### 67.3. Structured Data

Використовувати Schema.org JSON-LD там, де тип даних відповідає
фактичному контенту сторінки.

Передбачити:

``` text
Organization
WebSite
BreadcrumbList
Product
Offer
Brand
Article
FAQPage — тільки коли сторінка реально містить відповідний FAQ-контент
```

Product structured data повинна формуватися з актуальних application
data.

Приклад логічної структури:

``` text
Product
├── name
├── description
├── image
├── sku
├── brand
├── category
└── offers
    ├── price
    ├── priceCurrency
    ├── availability
    └── url
```

Не генерувати structured data, яка суперечить видимому користувачу
контенту.

### 67.4. Entity-first Content Model

Контент повинен будуватися навколо чітких сутностей та зв'язків:

``` text
Product
├── Brand
├── Category
├── Attributes
├── Variant
├── Compatibility
├── Related Products
└── Related Content
```

Для кожної сутності використовувати стабільні внутрішні ID, canonical
URL та однозначні назви.

### 67.5. Product Content

Product page повинна містити достатній текстовий контекст, а не лише
назву, фотографію та ціну.

Передбачити:

-   повну назву;
-   бренд;
-   SKU / артикул;
-   категорію;
-   короткий опис;
-   детальний опис;
-   структуровані характеристики;
-   комплектацію, якщо застосовується;
-   сумісність, якщо застосовується;
-   актуальну ціну;
-   статус наявності;
-   FAQ або відповіді на типові питання, коли вони реально корисні;
-   related guides/articles;
-   canonical URL;
-   дату актуалізації даних там, де це доречно.

Ключові факти не повинні бути доступні тільки всередині зображень.

### 67.6. Category Content

Category page повинна мати:

-   H1;
-   короткий description;
-   breadcrumbs;
-   дочірні категорії;
-   доступні filters;
-   product listing;
-   SEO/GEO description;
-   FAQ/guide content, якщо він реально додає користь;
-   internal links на пов'язані категорії та матеріали.

Не генерувати тисячі низькоякісних текстів лише для покриття ключових
слів.

### 67.7. Brand Pages

Для брендів створювати окремі entity pages:

``` text
/brand/[slug]
```

Brand page може містити:

-   назву;
-   logo;
-   опис;
-   країну;
-   офіційний website, якщо відомий;
-   доступні категорії;
-   товари бренду;
-   related articles;
-   structured data;
-   canonical URL.

### 67.8. Expert Content

CMS повинна дозволяти створювати експертний контент:

``` text
Guides
Comparisons
How-to articles
FAQ
Buying guides
Brand guides
Category guides
Glossary
```

Матеріали повинні мати чітку структуру:

``` text
Title
Summary
Author
Published date
Updated date
Main content
Sources/References, якщо використовуються
Related products
Related categories
Related articles
```

Для матеріалів, де важлива авторська експертиза, передбачити author
entity/profile.

### 67.9. Answer-first Content

Для інформаційних сторінок бажано мати коротку фактичну відповідь або
summary на початку, після чого --- детальне пояснення.

Контент повинен використовувати:

-   логічні headings;
-   короткі абзаци;
-   списки;
-   таблиці для структурованих порівнянь;
-   чіткі одиниці вимірювання;
-   однозначні назви характеристик.

Це не повинно погіршувати читабельність для людини.

### 67.10. Facts та Provenance

Для характеристик товарів бажано зберігати provenance/source metadata,
особливо якщо дані імпортуються з Tria, supplier feeds або вводяться
вручну.

Приклад:

``` text
source
sourceExternalId
sourceUpdatedAt
verifiedAt
```

Система повинна уникати ситуації, коли на різних сторінках публікуються
різні значення однієї характеристики.

### 67.11. Freshness

Для динамічних даних необхідно підтримувати актуальність:

-   price;
-   availability;
-   product status;
-   product specifications;
-   discontinued products;
-   redirects.

Після синхронізації Tria повинні оновлюватися залежні representations:

``` text
PostgreSQL
 ↓
Search Index
 ↓
Cache
 ↓
Storefront
 ↓
Structured Data
```

### 67.12. Internal Linking

Автоматично та/або через CMS підтримувати semantic internal linking:

``` text
Article → Product
Article → Category
Product → Brand
Product → Category
Product → Guide
Category → Guide
Brand → Products
```

Не створювати штучні link farms.

### 67.13. Canonical Entity URLs

Кожна публічна сутність повинна мати один canonical URL.

Наприклад:

``` text
/product/[slug]
/category/[...slug]
/brand/[slug]
/blog/[slug]
```

Filters, sorting, tracking parameters та інші URL variants не повинні
створювати неконтрольовані дублікати canonical content.

### 67.14. Machine-readable Feeds

Архітектура повинна дозволяти створення machine-readable feeds для
product/catalog data, якщо вони будуть потрібні зовнішнім платформам.

Feed generation повинна використовувати ті самі validated application
data, що й storefront.

### 67.15. llms.txt

Можна підтримати:

``` text
/llms.txt
```

як експериментальний machine-readable discovery/documentation layer.

`llms.txt` не вважати заміною:

-   robots.txt;
-   sitemap;
-   structured data;
-   canonical URLs;
-   якісного HTML-контенту.

Його використання повинно бути configurable, оскільки підтримка такого
механізму зовнішніми AI-системами може відрізнятися.

### 67.16. GEO Admin Tools

У Admin Panel додати GEO/SEO tooling.

Наприклад:

``` text
SEO & GEO
├── Metadata
├── Structured Data Preview
├── Entity Preview
├── Sitemap
├── Redirects
├── robots.txt
├── llms.txt
└── Content Quality
```

Для Product/Category/Brand/Article бажано показувати:

-   canonical URL;
-   indexability;
-   title;
-   description;
-   structured data status;
-   missing important fields;
-   localization completeness;
-   internal linking warnings.

### 67.17. GEO Playground

Development Playground повинен дозволяти тестувати:

-   rendered HTML;
-   metadata;
-   canonical URL;
-   JSON-LD;
-   entity representation;
-   localized content;
-   sitemap output;
-   robots rules;
-   llms.txt output;
-   product facts used для machine-readable representations.

Playground не повинен бути доступний у production.

### 67.18. Localization та GEO

GEO повинно працювати для всіх підтримуваних мов:

``` text
uk
ru
en
```

Кожна локалізована сторінка повинна мати коректні:

-   locale;
-   canonical/hreflang strategy;
-   localized metadata;
-   localized structured content;
-   consistent entity identity між мовами.

Переклад не повинен створювати окрему логічну Product entity --- це
локалізоване представлення тієї самої сутності.

### 67.19. GEO Performance Requirements

GEO не повинно створювати окремий важкий runtime pipeline для кожного
request.

JSON-LD, metadata та machine-readable representations повинні
формуватися з нормалізованих application data та кешуватися там, де це
безпечно.

### 67.20. GEO Monitoring

Передбачити можливість відстежувати:

-   AI/referral traffic;
-   landing pages;
-   crawler activity, якщо доступно з infrastructure logs;
-   найбільш цитовані/відвідувані content entities, якщо це можливо
    визначити з доступних analytics/referral data;
-   помилки structured data;
-   broken canonical URLs;
-   sitemap/indexing issues.

Не робити припущення, що конкретний AI provider гарантовано індексує або
цитує сторінку лише через наявність GEO markup.
