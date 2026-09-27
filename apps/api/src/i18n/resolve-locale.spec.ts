import { describe, expect, it } from 'vitest';
import { parseAcceptLanguage, resolveLocale } from './resolve-locale';

const supported = ['uk', 'ru', 'en'];

describe('parseAcceptLanguage', () => {
  it('orders by q and keeps header order on ties', () => {
    expect(parseAcceptLanguage('de;q=0.9, en-US, ru;q=0.9, *;q=0.1')).toEqual(['en', 'de', 'ru']);
  });

  it('ignores empty, wildcard and q=0 entries', () => {
    expect(parseAcceptLanguage(undefined)).toEqual([]);
    expect(parseAcceptLanguage('*, fr;q=0')).toEqual([]);
  });
});

describe('resolveLocale', () => {
  it('prefers the explicit locale', () => {
    expect(resolveLocale(supported, 'uk', 'ru', 'en')).toBe('ru');
    expect(resolveLocale(supported, 'uk', 'EN', undefined)).toBe('en');
  });

  it('uses Accept-Language when the explicit locale is missing or unsupported', () => {
    expect(resolveLocale(supported, 'uk', undefined, 'de, en-GB;q=0.8')).toBe('en');
    expect(resolveLocale(supported, 'uk', 'pl', 'ru')).toBe('ru');
  });

  it('falls back to the default locale', () => {
    expect(resolveLocale(supported, 'uk', 'pl', 'de')).toBe('uk');
    expect(resolveLocale(supported, 'uk', undefined, undefined)).toBe('uk');
  });
});
