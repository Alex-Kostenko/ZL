// Official Ukrainian romanization (Cabinet of Ministers Resolution No. 55, 2010).
const MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'h',
  ґ: 'g',
  д: 'd',
  е: 'e',
  є: 'ie',
  ж: 'zh',
  з: 'z',
  и: 'y',
  і: 'i',
  ї: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ь: '',
  ю: 'iu',
  я: 'ia',
  // Russian letters that may appear in imported names.
  ё: 'io',
  ы: 'y',
  э: 'e',
  ъ: '',
};

// At the start of a word these letters use the Y- form.
const WORD_START: Record<string, string> = { є: 'ye', ї: 'yi', й: 'y', ю: 'yu', я: 'ya' };

const APOSTROPHES = /['’ʼ`]/g;

/** Latin transliteration of Ukrainian text, keeping non-Cyrillic characters as is. */
export function transliterate(input: string): string {
  const text = input.toLowerCase().replace(APOSTROPHES, '').replace(/зг/g, 'zgh');
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    const atWordStart = i === 0 || !/[\p{L}\p{N}]/u.test(text[i - 1]!);
    out += (atWordStart && WORD_START[ch]) || (MAP[ch] ?? ch);
  }
  return out;
}

/**
 * URL slug: transliterated, lowercase ASCII, words joined by `-`, max `maxLength` chars
 * (cut at a word boundary). E.g. `Прилади нічного бачення` → `prylady-nichnoho-bachennia`.
 */
export function slugify(input: string, maxLength = 200): string {
  const slug = transliterate(input)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length <= maxLength) return slug;
  const cut = slug.slice(0, maxLength);
  return cut.includes('-') ? cut.slice(0, cut.lastIndexOf('-')) : cut;
}
