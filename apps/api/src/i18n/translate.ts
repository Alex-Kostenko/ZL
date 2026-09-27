/**
 * Per-field translation lookup (§59): the value in `locale`, else in `fallback`, else `null`.
 * Fallback is per field, so a partial translation still shows the default-locale texts it lacks.
 */
export function translator<T extends { locale: string }>(
  rows: readonly T[],
  locale: string,
  fallback: string,
): <K extends keyof T>(field: K) => NonNullable<T[K]> | null {
  const own = rows.find((t) => t.locale === locale);
  const base = rows.find((t) => t.locale === fallback);
  return (field) => own?.[field] ?? base?.[field] ?? null;
}
