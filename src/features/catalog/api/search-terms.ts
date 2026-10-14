/**
 * Search-term normalisation for the storefront's fuzzy fallback.
 *
 * The primary search path is Postgres full-text search, which needs the
 * shopper's words to match the catalogue's words. When it finds nothing,
 * `fetchProducts` retries with the query rewritten through this map:
 * common misspellings are corrected and everyday synonyms are expanded to
 * the word the catalogue actually uses (a shopper typing "mobile" means
 * the phones shelf, whose products are titled with "phone").
 *
 * Tokens not in the map pass through unchanged, and the original query is
 * never mutated — this only runs after the exact query returned zero rows.
 */
export const SEARCH_TERM_MAP: Record<string, string> = {
  // Misspellings
  iphne: 'iphone',
  iphnoe: 'iphone',
  samsng: 'samsung',
  samsumg: 'samsung',
  hedphones: 'headphones',
  headfones: 'headphones',
  leptop: 'laptop',
  labtop: 'laptop',
  earbds: 'earbuds',
  earphons: 'earphones',
  televsion: 'television',
  telivision: 'television',
  refridgerator: 'refrigerator',
  wasching: 'washing',
  // Synonyms / everyday words for catalogue words
  mobile: 'phone',
  cellphone: 'phone',
  cell: 'phone',
  smartphone: 'phone',
  tv: 'television',
  fridge: 'refrigerator',
  ac: 'air conditioner',
  conditioner: 'air conditioner',
  notebook: 'laptop',
  sneakers: 'shoes',
  trainers: 'shoes',
  watch: 'smartwatch',
};

/**
 * Rewrites a raw search string token by token. Returns the tokens joined
 * with single spaces, lowercased; a token that maps to two words (e.g.
 * "ac" -> "air conditioner") expands in place.
 */
export function normalizeSearchQuery(q: string): string {
  return q
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean)
    .map((token) => SEARCH_TERM_MAP[token] ?? token)
    .join(' ')
    .trim();
}
