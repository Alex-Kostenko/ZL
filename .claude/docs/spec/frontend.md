# Web app, storefront, UI, performance

> Фрагмент ТЗ «Мисливська лавка» v1.0. Номери розділів збережено (§N).

## 3. Web Application

### Technology

-   Next.js
-   React
-   TypeScript
-   Tailwind CSS
-   **shadcn/ui** --- основна бібліотека UI-компонентів
-   **Radix UI** --- accessible UI primitives для складних інтерактивних
    компонентів
-   **Lucide React** --- базова бібліотека іконок
-   **TanStack Table** --- таблиці Admin Panel із server-side
    pagination, sorting та filtering

### Frontend UI Architecture

Спільні UI primitives та reusable components зберігати у:

``` text
packages/ui/
├── button/
├── input/
├── textarea/
├── select/
├── checkbox/
├── radio-group/
├── switch/
├── dialog/
├── drawer/
├── dropdown-menu/
├── popover/
├── tooltip/
├── tabs/
├── accordion/
├── command/
├── table/
├── pagination/
├── form/
└── data-table/
```

Основні правила:

1.  **shadcn/ui** використовувати як основний component layer.
2.  **Radix UI** використовувати для accessible primitives та складної
    інтерактивної поведінки.
3.  Стилізацію виконувати через **Tailwind CSS**.
4.  Не додавати паралельно MUI, Ant Design або інший повноцінний UI
    framework без окремого технічного обґрунтування.
5.  Design tokens повинні відповідати бренд-системі «Мисливської лавки».
6.  Компоненти повинні підтримувати accessibility, focus states та
    keyboard navigation.
7.  Storefront та Admin Panel використовують спільні primitives, але
    можуть мати окремі domain/composition components.
8.  Для великих таблиць Admin Panel використовувати **TanStack Table**
    із server-side pagination, filtering та sorting. Не завантажувати
    весь каталог у browser.
9.  Загальні UI-компоненти не повинні містити business logic конкретного
    домену.
10. Компоненти shadcn/ui після додавання є частиною codebase та можуть
    адаптуватися під design system проєкту.

`apps/web` містить:

-   публічний Storefront;
-   закриту Admin Panel;
-   CMS interface.

Storefront та Admin повинні мати незалежні layouts та UI.

## 4. Storefront

Основні маршрути:

``` text
/
/catalog

/category/[...slug]
  ├── Level 1
  ├── Level 2
  └── Level 3

/product/[slug]
/brand/[slug]
/brands
/search

/sale
/antidron

/blog
/blog/[slug]

/about
/contacts
/delivery
/payment
/warranty

/cart
/checkout

/account
/account/orders
/account/profile

/login
/register
```

Storefront повинен використовувати SSR/SSG/ISR там, де це доцільно для
SEO та performance.

## 44. Performance

Цільові Core Web Vitals:

``` text
LCP < 2.5 s
INP < 200 ms
CLS < 0.1
```

Storefront та Admin повинні мати окремі bundles/layout boundaries там,
де це можливо.

## 45. Images

Pipeline:

``` text
original
 ↓
resize
 ↓
AVIF/WebP
 ↓
CDN
```

Не віддавати оригінальні великі зображення у product cards.
