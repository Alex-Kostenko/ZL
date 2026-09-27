/** Parses `Accept-Language` into primary language subtags, best first (`ru-UA,uk;q=0.8` → ru, uk). */
export function parseAcceptLanguage(header: string | undefined): string[] {
  if (!header) return [];
  return header
    .split(',')
    .map((part, index) => {
      const [tag = '', ...params] = part.trim().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      const weight = q ? Number(q.slice(2)) : 1;
      return { lang: tag.split('-')[0]!.toLowerCase(), weight, index };
    })
    .filter((l) => l.lang && l.lang !== '*' && Number.isFinite(l.weight) && l.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index)
    .map((l) => l.lang);
}

/**
 * Picks the response locale: explicit `?locale=` → `Accept-Language` → default.
 * An unsupported locale is not an error; it falls back like a missing one (§59).
 */
export function resolveLocale(
  supported: readonly string[],
  defaultLocale: string,
  requested: string | undefined,
  acceptLanguage: string | undefined,
): string {
  const candidates = [requested?.toLowerCase(), ...parseAcceptLanguage(acceptLanguage)];
  return candidates.find((c) => c !== undefined && supported.includes(c)) ?? defaultLocale;
}
