import { describe, expect, it } from 'vitest';
import { formatPrice } from './format';

describe('formatPrice', () => {
  it('groups digits per locale and hides zero kopecks', () => {
    expect(formatPrice('12499.00', 'uk')).toBe('12 499 ₴');
    expect(formatPrice('12499.50', 'en')).toBe('12,499.5 ₴');
  });

  it('falls back to the currency code', () => {
    expect(formatPrice('10', 'uk', 'EUR')).toBe('10 EUR');
  });
});
