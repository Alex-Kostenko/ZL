# Admin Panel, автентифікація, сесії, RBAC, аудит, безпека, налаштування

> Фрагмент ТЗ «Мисливська лавка» v1.0. Номери розділів збережено (§N).

## 13. Admin Panel

Admin Panel знаходиться за адресою:

``` text
/admin
```

Вона є частиною Next.js application.

### Структура

``` text
Dashboard

Catalog
├── Products
├── Categories
├── Brands
├── Attributes
├── Collections
└── Inventory

Orders
├── Orders
├── Returns
└── Customers

Marketing
├── Promotions
├── Sale
├── Antidron
└── Banners

Content
├── Pages
├── Blog
├── Menus
└── Media

SEO
├── Metadata
├── Redirects
└── Sitemap

Integrations
└── Tria

System
├── Users
├── Roles
├── Audit Log
└── Settings
```

## 14. Product Admin

Product list повинен бути оптимізований для великого каталогу.

Обов'язково:

-   server-side search;
-   filtering;
-   sorting;
-   pagination;
-   bulk selection;
-   bulk actions.

### Bulk actions

-   Publish / Unpublish
-   Change category
-   Change brand
-   Sale ON/OFF
-   Antidron ON/OFF
-   Change status
-   Export
-   Delete

Потрібен CSV/XLSX import/export.

## 22. Admin Authentication

Admin authentication:

``` text
email
+
password
+
TOTP
```

Паролі хешувати через **Argon2id**.

TOTP повинен бути сумісний із:

-   Google Authenticator;
-   Microsoft Authenticator;
-   1Password;
-   іншими стандартними TOTP applications.

TOTP secret повинен зберігатися зашифрованим, а не plaintext.

## 23. Admin Sessions

Session/token architecture повинна використовувати secure cookies:

``` text
HttpOnly
Secure
SameSite
```

Не зберігати admin access token у `localStorage`.

Передбачити:

-   session expiration;
-   revoke session;
-   logout all devices;
-   recovery codes.

## 24. RBAC

Початкові ролі:

``` text
SUPER_ADMIN
ADMIN
CATALOG_MANAGER
CONTENT_MANAGER
ORDER_MANAGER
```

Приклади permissions:

``` text
product.read
product.create
product.update
product.delete

order.read
order.update

content.read
content.update

inventory.read

user.manage
role.manage
settings.manage
```

NestJS перевіряє permissions незалежно від frontend.

## 25. Audit Log

Усі критичні admin operations повинні логуватися.

``` text
id
adminUserId
action
entity
entityId
before
after
ip
userAgent
createdAt
```

Приклад:

``` text
PRODUCT_PRICE_CHANGED
DNT Zulus HD
31 900 → 32 500 UAH
```

## 46. Security

Обов'язково:

-   HTTPS;
-   CSP;
-   CORS policy;
-   CSRF protection where applicable;
-   rate limiting;
-   backend input validation;
-   SQL injection protection;
-   XSS mitigation;
-   secure cookies;
-   Argon2id password hashing;
-   TOTP;
-   RBAC.

Admin endpoints повинні мати суворіші security/rate-limit policies.

## 60. Configuration

Через Admin повинні керуватися системні налаштування:

-   Store name;
-   Contacts;
-   Currency;
-   VAT;
-   Delivery;
-   Payment;
-   Social networks;
-   SEO defaults;
-   integration settings, якщо вони не є секретами.

Не hardcode business configuration у frontend.

## 61. Secrets

Secrets зберігати через environment variables / secrets manager.

Наприклад:

``` text
DATABASE_URL
REDIS_URL
S3 credentials
TRIA credentials
TOTP encryption key
email credentials
payment credentials
```

Не commit `.env` із production secrets у Git.
