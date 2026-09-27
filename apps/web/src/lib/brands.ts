// Brand index (`/brands`) helpers. Pure: no API access.

/** Group label for names that do not start with a letter (digits, symbols). */
export const OTHER_GROUP = '0–9';

export interface LetterGroup<T> {
  letter: string;
  /** Anchor id, ASCII-safe (`brands-a`, `brands-u416`). */
  anchor: string;
  items: T[];
}

const ASCII_LETTER = /^[A-Z]$/;
const LATIN = /^\p{Script=Latin}$/u;
const LETTER = /^\p{L}$/u;

function letterOf(name: string, locale: string): string {
  const first = name.trim().charAt(0).toLocaleUpperCase(locale);
  return LETTER.test(first) ? first : OTHER_GROUP;
}

/** Latin letters, then other scripts (Cyrillic), then digits/symbols. */
function rank(letter: string): number {
  if (letter === OTHER_GROUP) return 2;
  return LATIN.test(letter) ? 0 : 1;
}

function anchorOf(letter: string): string {
  if (letter === OTHER_GROUP) return 'brands-other';
  if (ASCII_LETTER.test(letter)) return `brands-${letter.toLowerCase()}`;
  return `brands-u${letter.codePointAt(0)!.toString(16)}`;
}

/** Groups items by the first letter of `name`, keeping the input order inside each group. */
export function groupByLetter<T extends { name: string }>(
  items: T[],
  locale: string,
): LetterGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const letter = letterOf(item.name, locale);
    groups.set(letter, [...(groups.get(letter) ?? []), item]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b, locale))
    .map(([letter, groupItems]) => ({ letter, anchor: anchorOf(letter), items: groupItems }));
}
