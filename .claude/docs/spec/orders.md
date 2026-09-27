# Замовлення, state machine, кошик, checkout, клієнти

> Фрагмент ТЗ «Мисливська лавка» v1.0. Номери розділів збережено (§N).

## 36. Orders

### Order

``` text
id
number
customerId
status
paymentStatus
deliveryStatus
subtotal
discount
delivery
total
currency
createdAt
updatedAt
```

### OrderItem

OrderItem повинен зберігати snapshot:

``` text
sku
title
price
quantity
total
```

Історичне замовлення не повинно змінюватися після редагування Product.

## 37. Order State Machine

Наприклад:

``` text
NEW
 ↓
CONFIRMED
 ↓
PROCESSING
 ↓
SHIPPED
 ↓
COMPLETED
```

Додаткові:

``` text
CANCELLED
RETURNED
```

Статуси повинні бути формалізовані, а переходи --- контрольовані backend
logic.

## 38. Cart

Підтримувати:

-   Guest Cart;
-   Authenticated Cart.

Після login передбачити merge guest cart та user cart.

Перед створенням Order backend повторно перевіряє:

-   availability;
-   actual price;
-   discounts;
-   quantity limits.

## 39. Checkout

Checkout не довіряє значенням, отриманим із frontend.

Backend повторно розраховує:

-   price;
-   discount;
-   availability;
-   delivery;
-   total.

Frontend total використовується лише для UI.

## 40. Customers

Customer та AdminUser --- різні security domains.

Customer:

``` text
id
email
phone
firstName
lastName
createdAt
updatedAt
```
