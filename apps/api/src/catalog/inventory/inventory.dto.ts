export class WarehouseStockDto {
  code: string;
  name: string;
  /** Units available for sale in this warehouse (never negative). */
  available: number;
}

export class StockDto {
  /** Units available for sale across active warehouses (never negative). */
  available: number;
  inStock: boolean;
  /** Active warehouses with stock, in display order. */
  warehouses: WarehouseStockDto[];
}
