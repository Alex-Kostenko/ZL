import type {
  BreadcrumbDto,
  CategoryDetailDto,
  CategoryImageDto,
  CategoryNodeDto,
  CategorySummaryDto,
} from './categories.dto';

export interface CategoryRow {
  id: string;
  parentId: string | null;
  slug: string;
  path: string;
  depth: number;
  icon: string | null;
  position: number;
  isActive: boolean;
  image: CategoryImageDto | null;
  translations: { locale: string; name: string; description: string | null }[];
}

/** A storefront-visible category, localized. The cached unit: one list per locale. */
export interface LocalizedCategory {
  id: string;
  parentId: string | null;
  slug: string;
  path: string;
  depth: number;
  name: string;
  description: string | null;
  icon: string | null;
  image: CategoryImageDto | null;
}

/**
 * Visible categories (active, with every ancestor active) in menu order (position, then name).
 * Texts use `locale`, falling back to `fallback` per field (§59); a missing name shows the slug.
 */
export function localizeCategories(
  rows: CategoryRow[],
  locale: string,
  fallback: string,
): LocalizedCategory[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const visible = new Map<string, boolean>();
  const isVisible = (row: CategoryRow): boolean => {
    let result = visible.get(row.id);
    if (result === undefined) {
      const parent = row.parentId ? byId.get(row.parentId) : undefined;
      result = row.isActive && (row.parentId === null || (!!parent && isVisible(parent)));
      visible.set(row.id, result);
    }
    return result;
  };

  return rows
    .filter(isVisible)
    .map((row) => {
      const own = row.translations.find((t) => t.locale === locale);
      const base = row.translations.find((t) => t.locale === fallback);
      return {
        position: row.position,
        category: {
          id: row.id,
          parentId: row.parentId,
          slug: row.slug,
          path: row.path,
          depth: row.depth,
          name: own?.name ?? base?.name ?? row.slug,
          description: own?.description ?? base?.description ?? null,
          icon: row.icon,
          image: row.image,
        },
      };
    })
    .sort(
      (a, b) => a.position - b.position || a.category.name.localeCompare(b.category.name, locale),
    )
    .map((x) => x.category);
}

function childrenOf(categories: LocalizedCategory[]): Map<string | null, LocalizedCategory[]> {
  const map = new Map<string | null, LocalizedCategory[]>();
  for (const c of categories) {
    const list = map.get(c.parentId) ?? [];
    list.push(c);
    map.set(c.parentId, list);
  }
  return map;
}

export function buildTree(categories: LocalizedCategory[]): CategoryNodeDto[] {
  const children = childrenOf(categories);
  const build = (parentId: string | null): CategoryNodeDto[] =>
    (children.get(parentId) ?? []).map((c) => ({
      id: c.id,
      slug: c.slug,
      path: c.path,
      depth: c.depth,
      name: c.name,
      icon: c.icon,
      image: c.image,
      children: build(c.id),
    }));
  return build(null);
}

/** Category page data by slug path, or `null` when it does not exist or is hidden. */
export function findByPath(
  categories: LocalizedCategory[],
  path: string,
): Omit<CategoryDetailDto, 'locale'> | null {
  const category = categories.find((c) => c.path === path);
  if (!category) return null;

  const byId = new Map(categories.map((c) => [c.id, c]));
  const breadcrumbs: BreadcrumbDto[] = [];
  for (let c: LocalizedCategory | undefined = category; c;) {
    breadcrumbs.unshift({ name: c.name, path: c.path });
    c = c.parentId ? byId.get(c.parentId) : undefined;
  }

  const children: CategorySummaryDto[] = categories
    .filter((c) => c.parentId === category.id)
    .map(({ id, slug, path: childPath, name, icon, image }) => ({
      id,
      slug,
      path: childPath,
      name,
      icon,
      image,
    }));

  const { parentId: _parentId, ...rest } = category;
  return { ...rest, breadcrumbs, children };
}
