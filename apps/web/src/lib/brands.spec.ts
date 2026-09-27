import { describe, expect, it } from 'vitest';
import { groupByLetter, OTHER_GROUP } from './brands';

const names = (...list: string[]) => list.map((name) => ({ name }));

describe('groupByLetter', () => {
  it('orders Latin, then Cyrillic, then digits and symbols', () => {
    const groups = groupByLetter(
      names('Žabka', 'beretta', '5.11', 'Форт', 'Anschütz', 'Blaser'),
      'uk',
    );
    expect(groups.map((g) => g.letter)).toEqual(['A', 'B', 'Ž', 'Ф', OTHER_GROUP]);
    expect(groups[1]!.items.map((i) => i.name)).toEqual(['beretta', 'Blaser']);
  });

  it('builds ASCII-safe anchors', () => {
    const anchors = groupByLetter(names('Blaser', 'Форт', '3M'), 'uk').map((g) => g.anchor);
    expect(anchors).toEqual(['brands-b', 'brands-u424', 'brands-other']);
  });

  it('returns no groups for no items', () => {
    expect(groupByLetter([], 'uk')).toEqual([]);
  });
});
