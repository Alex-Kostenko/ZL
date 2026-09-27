import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { StockDto } from './inventory.dto';
import { type StockRow, toStockDto } from './stock';

/** Loaded stock of a set of variants; answers per variant or for any group of them (a product). */
export class StockSnapshot {
  constructor(private readonly rows: ReadonlyMap<string, readonly StockRow[]>) {}

  of(variantId: string): StockDto {
    return toStockDto(this.rows.get(variantId) ?? []);
  }

  total(variantIds: readonly string[]): StockDto {
    return toStockDto(variantIds.flatMap((id) => this.rows.get(id) ?? []));
  }
}

/**
 * Sellable stock (§11): `available = quantity - reserved` per warehouse, computed by PostgreSQL.
 * The single place that turns inventory rows into what can be sold; checkout (12.3) reuses it.
 */
@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async forVariants(variantIds: readonly string[]): Promise<StockSnapshot> {
    const rows = variantIds.length
      ? await this.prisma.inventory.findMany({
          where: { variantId: { in: [...variantIds] }, available: { gt: 0 } },
          select: {
            variantId: true,
            available: true,
            warehouse: { select: { code: true, name: true, position: true, isActive: true } },
          },
        })
      : [];
    const byVariant = new Map<string, StockRow[]>();
    for (const { variantId, ...row } of rows) {
      const list = byVariant.get(variantId) ?? [];
      list.push(row);
      byVariant.set(variantId, list);
    }
    return new StockSnapshot(byVariant);
  }
}
