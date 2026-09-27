# Інтеграція Tria, синхронізація, BullMQ, ідемпотентність

> Фрагмент ТЗ «Мисливська лавка» v1.0. Номери розділів збережено (§N).

## 26. Tria Integration

Створити ізольований integration module.

``` text
integrations/
└── tria/
    ├── tria.module.ts
    ├── tria.service.ts
    ├── tria.adapter.ts
    ├── tria.mapper.ts
    └── sync/
        ├── products.sync.ts
        ├── prices.sync.ts
        ├── inventory.sync.ts
        └── orders.sync.ts
```

Основний application layer не повинен залежати від конкретного протоколу
Tria.

### Adapter contract

``` ts
interface TriaAdapter {
  getProducts(): Promise<ExternalProduct[]>;
  getPrices(): Promise<ExternalPrice[]>;
  getInventory(): Promise<ExternalInventory[]>;
  createOrder(order: Order): Promise<ExternalOrder>;
}
```

Реалізація може використовувати:

-   API;
-   database integration;
-   file exchange;
-   local bridge.

Зміна способу підключення Tria не повинна вимагати переписування
доменної логіки магазину.

## 27. Source of Truth

### Tria

Tria є джерелом істини для:

-   SKU / external product ID;
-   accounting nomenclature;
-   accounting prices;
-   warehouse stock;
-   warehouses.

### Website

Website є джерелом істини для:

-   web title;
-   slug;
-   description;
-   photos;
-   web categories;
-   attributes;
-   SEO;
-   `isSale`;
-   `isAntidron`;
-   web content.

Конкретні правила синхронізації цін повинні бути зафіксовані після
перевірки поточної конфігурації Tria.

## 28. Tria Synchronization

Основний flow:

``` text
TRIA
 ↓
Tria Adapter
 ↓
Mapper
 ↓
Validation
 ↓
Queue
 ↓
PostgreSQL
 ↓
Meilisearch
 ↓
Cache invalidation
```

Великі синхронізації не виконувати всередині HTTP request.

## 29. Background Jobs

Використовувати **Redis + BullMQ**.

Queues:

``` text
tria-products
tria-inventory
tria-prices
tria-orders

search-index

images

emails

orders
```

Job повинен підтримувати:

-   retry;
-   exponential/fixed backoff;
-   timeout;
-   logging;
-   failure handling;
-   dead-letter/review flow для критичних помилок.

## 30. Idempotency

Обов'язкова для:

-   Tria synchronization;
-   checkout;
-   payment operations;
-   order creation;
-   external integrations.

Повторне виконання одного job/request не повинно створювати дублікати.

Одне замовлення не повинно двічі потрапити в Tria.

## 31. Tria Sync Status

Admin route:

``` text
/admin/integrations/tria
```

Повинен показувати:

``` text
Connection: OK

Last product sync:
25.09.2026 14:31

Products: 51 283
Updated: 127
Failed: 3

Last inventory sync:
25.09.2026 14:35

[Sync now]
```

Також потрібні:

-   sync history;
-   errors;
-   retry;
-   last successful synchronization;
-   job details.
