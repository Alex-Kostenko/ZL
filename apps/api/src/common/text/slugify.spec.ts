import { describe, expect, it } from 'vitest';
import { slugify, transliterate } from './slugify';

describe('transliterate (KMU 2010)', () => {
  it.each([
    ['Згорани', 'zghorany'],
    ['Юрій', 'yurii'],
    ['Єнакієве', 'yenakiieve'],
    ['Їжакевич', 'yizhakevych'],
    ['Йосипівка', 'yosypivka'],
    ['Щербухи', 'shcherbukhy'],
    ['Гвинтівки', 'hvyntivky'],
    ["Пістолетні руків'я", 'pistoletni rukivia'],
  ])('%s → %s', (input, expected) => {
    expect(transliterate(input)).toBe(expected);
  });
});

describe('slugify', () => {
  it.each([
    ['Прилади нічного бачення', 'prylady-nichnoho-bachennia'],
    ['Приклади/адаптери/щоки', 'pryklady-adaptery-shchoky'],
    ['Саундмодератори і ДГК', 'saundmoderatory-i-dhk'],
    ['Ножі та ліхтарі', 'nozhi-ta-likhtari'],
    ['  Swarovski Optik  ', 'swarovski-optik'],
    ['Patrony .308 Win', 'patrony-308-win'],
    ['Crème & Brûlée', 'creme-and-brulee'],
  ])('%j → %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('cuts long slugs at a word boundary', () => {
    expect(slugify('Тепловізійні монокуляри та бінокуляри', 25)).toBe('teploviziini-monokuliary');
  });
});
