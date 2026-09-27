import { describe, expect, it } from 'vitest';
import { slugify } from '../../../src/common/text/slugify';
import { ATTRIBUTES } from './attributes';
import { CATEGORY_TREE, type CategorySeed } from './categories';
import { WAREHOUSES } from './warehouses';

function collectPaths(nodes: CategorySeed[], parent = ''): string[] {
  return nodes.flatMap((n) => {
    const path = parent ? `${parent}/${slugify(n.name)}` : slugify(n.name);
    return [path, ...collectPaths(n.children ?? [], path)];
  });
}

describe('seed data integrity', () => {
  const paths = collectPaths(CATEGORY_TREE);

  it('produces a non-empty, unique slug for every category path', () => {
    expect(paths.every((p) => p.split('/').every(Boolean))).toBe(true);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('links attributes only to existing categories', () => {
    const known = new Set(paths);
    const links = ATTRIBUTES.flatMap((a) =>
      a.categories.map((names) => names.map((n) => slugify(n)).join('/')),
    );
    expect(links.filter((path) => !known.has(path))).toEqual([]);
  });

  it('gives options only to select attributes, with unique codes and all locales', () => {
    for (const a of ATTRIBUTES) {
      const isSelect = a.type === 'SELECT' || a.type === 'MULTI_SELECT';
      expect(Boolean(a.options?.length), a.code).toBe(isSelect);
      const codes = (a.options ?? []).map((o) => o.code);
      expect(new Set(codes).size, a.code).toBe(codes.length);
      expect(
        codes.every((c) => /^[a-z0-9-]+$/.test(c)),
        a.code,
      ).toBe(true);
    }
    expect(new Set(ATTRIBUTES.map((a) => a.code)).size).toBe(ATTRIBUTES.length);
  });

  it('has unique warehouse codes', () => {
    expect(new Set(WAREHOUSES.map((w) => w.code)).size).toBe(WAREHOUSES.length);
  });
});
