import { describe, expect, it } from 'vitest';
import {
  breadcrumbsOf,
  buildTree,
  type CategoryRow,
  findByPath,
  localizeCategories,
  subtreeIds,
} from './category-tree';

function row(
  id: string,
  parentId: string | null,
  path: string,
  extra: Partial<CategoryRow> = {},
): CategoryRow {
  const slug = path.split('/').pop()!;
  return {
    id,
    parentId,
    slug,
    path,
    depth: path.split('/').length - 1,
    icon: null,
    position: 0,
    isActive: true,
    image: null,
    translations: [{ locale: 'uk', name: `uk:${slug}`, description: `uk-desc:${slug}` }],
    ...extra,
  };
}

const rows: CategoryRow[] = [
  row('a', null, 'zbroia', {
    position: 1,
    translations: [
      { locale: 'uk', name: 'Зброя', description: 'опис' },
      { locale: 'en', name: 'Weapons', description: null },
    ],
  }),
  row('b', null, 'odiah', { position: 0 }),
  row('a1', 'a', 'zbroia/nozhi', { position: 2 }),
  row('a2', 'a', 'zbroia/luky', { position: 1 }),
  row('a2x', 'a2', 'zbroia/luky/strily'),
  row('h', 'a', 'zbroia/prykhovana', { isActive: false }),
  row('h1', 'h', 'zbroia/prykhovana/dytyna'),
  row('orphan', 'missing', 'nichyi/dytyna'),
];

describe('localizeCategories', () => {
  const list = localizeCategories(rows, 'en', 'uk');

  it('hides inactive categories with their whole subtree and orphans', () => {
    const paths = list.map((c) => c.path);
    expect(paths).not.toContain('zbroia/prykhovana');
    expect(paths).not.toContain('zbroia/prykhovana/dytyna');
    expect(paths).not.toContain('nichyi/dytyna');
    expect(paths).toHaveLength(5);
  });

  it('falls back to the default locale per field', () => {
    const weapons = list.find((c) => c.id === 'a')!;
    expect(weapons.name).toBe('Weapons');
    expect(weapons.description).toBe('опис');
    expect(list.find((c) => c.id === 'b')!.name).toBe('uk:odiah');
  });

  it('shows the slug when no translation exists', () => {
    const [c] = localizeCategories([row('x', null, 'bez-nazvy', { translations: [] })], 'uk', 'uk');
    expect(c!.name).toBe('bez-nazvy');
  });
});

describe('buildTree', () => {
  it('nests children in position order', () => {
    const tree = buildTree(localizeCategories(rows, 'uk', 'uk'));
    expect(tree.map((n) => n.path)).toEqual(['odiah', 'zbroia']);
    const weapons = tree[1]!;
    expect(weapons.children.map((n) => n.path)).toEqual(['zbroia/luky', 'zbroia/nozhi']);
    expect(weapons.children[0]!.children.map((n) => n.path)).toEqual(['zbroia/luky/strily']);
  });
});

describe('breadcrumbsOf / subtreeIds', () => {
  const list = localizeCategories(rows, 'uk', 'uk');

  it('builds breadcrumbs by id and returns none for hidden categories', () => {
    expect(breadcrumbsOf(list, 'a2x').map((b) => b.path)).toEqual([
      'zbroia',
      'zbroia/luky',
      'zbroia/luky/strily',
    ]);
    expect(breadcrumbsOf(list, 'h1')).toEqual([]);
  });

  it('collects visible descendants without matching sibling prefixes', () => {
    expect(subtreeIds(list, 'zbroia/luky')?.sort()).toEqual(['a2', 'a2x']);
    expect(subtreeIds(list, 'zbroia')?.sort()).toEqual(['a', 'a1', 'a2', 'a2x']);
    expect(subtreeIds(list, 'zbroia/lu')).toBeNull();
    expect(subtreeIds(list, 'zbroia/prykhovana')).toBeNull();
  });
});

describe('findByPath', () => {
  const list = localizeCategories(rows, 'uk', 'uk');

  it('returns breadcrumbs from the root and direct children', () => {
    const detail = findByPath(list, 'zbroia/luky')!;
    expect(detail.breadcrumbs).toEqual([
      { name: 'Зброя', path: 'zbroia' },
      { name: 'uk:luky', path: 'zbroia/luky' },
    ]);
    expect(detail.children.map((c) => c.path)).toEqual(['zbroia/luky/strily']);
    expect(detail).not.toHaveProperty('parentId');
  });

  it('returns null for unknown or hidden paths', () => {
    expect(findByPath(list, 'nema')).toBeNull();
    expect(findByPath(list, 'zbroia/prykhovana/dytyna')).toBeNull();
  });
});
