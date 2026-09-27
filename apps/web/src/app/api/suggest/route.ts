import { hasLocale } from 'next-intl';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';
import { getSuggestions } from '@/lib/catalog';

/** Shorter queries are not worth a request (the dropdown opens from 2 characters). */
const MIN_QUERY = 2;
const MAX_QUERY = 100;

/**
 * Same-origin proxy for the header autocomplete: the browser never talks to the API directly
 * (no CORS, API URL stays server-side). `GET /api/suggest?q=…&locale=uk`.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = (params.get('q') ?? '').trim().slice(0, MAX_QUERY);
  const localeParam = params.get('locale');
  const locale = hasLocale(routing.locales, localeParam) ? localeParam : routing.defaultLocale;

  if (q.length < MIN_QUERY) {
    return NextResponse.json({
      locale,
      query: q,
      products: [],
      categories: [],
      brands: [],
      degraded: false,
    });
  }

  const result = await getSuggestions(locale, q);
  if (!result) return NextResponse.json({ error: 'unavailable' }, { status: 503 });

  return NextResponse.json(result, {
    // Popular prefixes repeat a lot; prices and stock may lag by a minute.
    headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300' },
  });
}
