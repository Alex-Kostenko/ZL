import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { resolveLocale } from './resolve-locale';

export interface LocaleSettings {
  /** Active locale codes, by position. */
  codes: string[];
  defaultLocale: string;
}

/** Locales change only via migration/admin, so a short in-process cache is enough. */
const TTL_MS = 60_000;

@Injectable()
export class LocaleService {
  private cached?: { value: Promise<LocaleSettings>; expiresAt: number };

  constructor(private readonly prisma: PrismaService) {}

  settings(): Promise<LocaleSettings> {
    if (!this.cached || this.cached.expiresAt < Date.now()) {
      const value = this.load();
      this.cached = { value, expiresAt: Date.now() + TTL_MS };
      value.catch(() => (this.cached = undefined));
    }
    return this.cached.value;
  }

  /** Response locale for a request (`?locale=` → `Accept-Language` → default). */
  async resolve(
    requested: string | undefined,
    acceptLanguage: string | undefined,
  ): Promise<string> {
    const { codes, defaultLocale } = await this.settings();
    return resolveLocale(codes, defaultLocale, requested, acceptLanguage);
  }

  private async load(): Promise<LocaleSettings> {
    const rows = await this.prisma.locale.findMany({
      where: { isActive: true },
      orderBy: { position: 'asc' },
      select: { code: true, isDefault: true },
    });
    const defaultLocale = rows.find((r) => r.isDefault)?.code ?? 'uk';
    return { codes: rows.map((r) => r.code), defaultLocale };
  }
}
