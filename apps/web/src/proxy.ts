import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intl = createMiddleware(routing);

const DEFAULT_PREFIX = `/${routing.defaultLocale}`;

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Decision 1.4: /uk/... is a permanent duplicate of the unprefixed URL
  // (next-intl would answer 307).
  if (pathname === DEFAULT_PREFIX || pathname.startsWith(`${DEFAULT_PREFIX}/`)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(DEFAULT_PREFIX.length) || '/';
    return NextResponse.redirect(url, 301);
  }

  return intl(request);
}

export const config = {
  // Everything except API routes, Next internals, the admin panel (not localized) and files.
  matcher: ['/((?!api|_next|_vercel|admin|.*\\..*).*)'],
};
