import type { StockDto } from './inventory.dto';

/** An `inventory` row (one variant × warehouse) with its warehouse. */
export interface StockRow {
  /** `quantity - reserved`; negative when Tria lowered quantity below open reservations. */
  available: number;
  warehouse: { code: string; name: string; position: number; isActive: boolean };
}

/**
 * Sellable stock (§11) of one variant, or of a whole product when given all its variants' rows.
 * Each row is clamped at 0 before summing, so an over-reservation of one variant or warehouse
 * never hides stock elsewhere; inactive warehouses are excluded.
 */
export function toStockDto(rows: readonly StockRow[]): StockDto {
  const byCode = new Map<string, { name: string; position: number; available: number }>();
  for (const { available, warehouse } of rows) {
    if (!warehouse.isActive || available <= 0) continue;
    const entry = byCode.get(warehouse.code) ?? { ...warehouse, available: 0 };
    entry.available += available;
    byCode.set(warehouse.code, entry);
  }
  const warehouses = [...byCode.entries()]
    .sort(([, a], [, b]) => a.position - b.position)
    .map(([code, { name, available }]) => ({ code, name, available }));
  const available = warehouses.reduce((sum, w) => sum + w.available, 0);
  return { available, inStock: available > 0, warehouses };
}
