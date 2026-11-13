// OCR reads many labels in capitals ("CAMP DEL GAL"). The form shows and writes them in a readable
// case instead: Title Case, small connecting words lower ("Camp del Gal", "Château d'Yquem").
// Text that already has lower case letters is taken as written.
// The parser's own Title Case is titleCase() in normalize.ts (other word lists, see there).

/** Connecting words that stay lower case inside a name (never at its start). */
const SMALL_WORDS = new Set([
  'd', 'l', 'de', 'di', 'da', 'del', 'della', 'delle', 'dei', 'degli', 'dal', 'dalla', 'dell', 'all', 'nell', 'dall', 'sull', 'der', 'den', 'des', 'du',
  'la', 'le', 'les', 'los', 'las', 'al', 'am', 'an', 'auf', 'bei', 'im', 'in', 'von', 'vom', 'zu', 'zum', 'zur',
  'van', 'y', 'e', 'et', 'und', 'and', 'of', 'the', '&',
])

/** Legal forms, appellation labels and numerals that read wrong in Title Case. */
const ACRONYMS = new Set(['SA', 'SAS', 'SARL', 'SRL', 'AG', 'KG', 'DOC', 'DOCG', 'AOC', 'AOP', 'IGT', 'IGP', 'VDP', 'II', 'III', 'IV'])

const upperFirst = (s: string) => {
  const [first = '', ...rest] = Array.from(s)
  return first.toLocaleUpperCase() + rest.join('')
}

/** One word in lower case with its parts capitalized: hyphens split parts, an elision ("d'") stays lower. */
function titleWord(word: string, first: boolean): string {
  // Legal forms and appellations, also with dots (S.A., A.O.C.)
  if (ACRONYMS.has(word) || /^(\p{Lu}\.){2,}$/u.test(word)) return word
  const lower = word.toLocaleLowerCase()
  if (!first && SMALL_WORDS.has(lower)) return lower
  return lower
    .split('-')
    .map((part, i) => {
      const elision = /^(\p{L}{1,5})(['’])(.+)$/u.exec(part)
      if (elision) {
        const [, article, mark, rest] = elision
        const kept = SMALL_WORDS.has(article) && !(first && i === 0)
        return (kept ? article : upperFirst(article)) + mark + upperFirst(rest)
      }
      return upperFirst(part)
    })
    .join('-')
}

/** The label line in readable case: ALL-CAPS becomes Title Case, anything else only gets tidy whitespace. */
export function readableCase(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  const hasLetter = /\p{L}/u.test(clean)
  const hasLower = /\p{Ll}/u.test(clean)
  if (!hasLetter || hasLower) return clean
  return clean
    .split(' ')
    .map((word, i) => titleWord(word, i === 0))
    .join(' ')
}
