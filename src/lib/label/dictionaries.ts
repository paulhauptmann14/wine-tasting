// Word lists for reading wine labels. All terms are matched on folded text (see normalize.ts):
// lowercase, no diacritics, ß → ss. Spaces and hyphens in a term also match each other.

import type { Sweetness } from '@/lib/tasting/sweetness'
import type { WineType } from '@/lib/tasting/wine-type'

export type GrapeColour = 'red' | 'white'
export type Grape = { canonical: string; colour: GrapeColour; aliases: string[] }

const red = (canonical: string, ...synonyms: string[]): Grape => ({ canonical, colour: 'red', aliases: [canonical, ...synonyms] })
const white = (canonical: string, ...synonyms: string[]): Grape => ({ canonical, colour: 'white', aliases: [canonical, ...synonyms] })

/**
 * Common grape varieties with their synonyms. Synonyms share one entry, so "Spätburgunder" and
 * "Pinot Noir" on the same label count once. The colour is the colour of the wine it usually gives.
 */
export const GRAPES: Grape[] = [
  // Germany & Austria – red
  red('Spätburgunder', 'Blauer Spätburgunder', 'Pinot Noir', 'Pinot Nero', 'Blauburgunder', 'Pinot Negro'),
  red('Frühburgunder'),
  red('Schwarzriesling', 'Pinot Meunier', 'Meunier', 'Müllerrebe'),
  red('Lemberger', 'Blauer Lemberger', 'Blaufränkisch', 'Limberger', 'Kékfrankos'),
  red('Trollinger', 'Blauer Trollinger', 'Schiava', 'Vernatsch'),
  // Not a Muskateller and not a Trollinger: its own red variety
  red('Muskat-Trollinger', 'Muskattrollinger'),
  red('Dornfelder'),
  red('Portugieser', 'Blauer Portugieser'),
  red('Regent'),
  red('Zweigelt', 'Blauer Zweigelt', 'Rotburger'),
  red('St. Laurent', 'Sankt Laurent', 'Saint Laurent'),
  red('Acolon'),
  red('Cabernet Dorsa'),
  red('Cabernet Mitos'),
  red('Cabernet Cortis'),
  red('Cabernet Cubin'),
  red('Domina'),
  red('Dunkelfelder'),
  red('Pinotin'),
  red('Blauer Wildbacher'),
  // France & international – red
  red('Merlot'),
  red('Cabernet Sauvignon'),
  red('Cabernet Franc'),
  red('Cabernet'),
  red('Cabernet Carbon'),
  red('Cabernet Jura'),
  red('Cabernet Noir'),
  red('Petit Verdot'),
  red('Carmenère'),
  red('Malbec'),
  red('Tannat'),
  red('Syrah', 'Shiraz'),
  red('Grenache', 'Grenache Noir', 'Garnacha', 'Garnacha Tinta', 'Garnatxa', 'Cannonau'),
  red('Mourvèdre', 'Monastrell', 'Mataro'),
  red('Carignan', 'Cariñena', 'Mazuelo', 'Carignano', 'Samsó'),
  red('Cinsault', 'Cinsaut'),
  red('Gamay'),
  red('Pinotage'),
  red('Petite Sirah'),
  red('Poulsard'),
  red('Trousseau'),
  // Spain & Portugal – red
  red('Tempranillo', 'Tinta Roriz', 'Tinto Fino', 'Tinta de Toro', 'Cencibel', 'Ull de Llebre', 'Aragonez'),
  red('Graciano'),
  red('Mencía'),
  red('Bobal'),
  red('Touriga Nacional'),
  red('Touriga Franca'),
  red('Baga'),
  red('Castelão'),
  red('Alicante Bouschet', 'Garnacha Tintorera'),
  // Italy – red
  red('Sangiovese', 'Brunello', 'Morellino', 'Prugnolo Gentile', 'Sangioveto'),
  red('Nebbiolo', 'Chiavennasca'),
  red('Barbera'),
  red('Dolcetto'),
  red('Montepulciano'),
  red('Aglianico'),
  red("Nero d'Avola"),
  red('Negroamaro'),
  red('Primitivo', 'Zinfandel'),
  red('Corvina'),
  red('Corvinone'),
  red('Rondinella'),
  red('Molinara'),
  red('Lagrein'),
  red('Teroldego'),
  red('Refosco'),
  red('Sagrantino'),
  red('Nerello Mascalese'),
  red('Frappato'),
  red('Cesanese'),
  red('Lambrusco'),
  red('Malvasia Nera'),
  // Eastern Europe & Eastern Mediterranean – red
  red('Kadarka'),
  red('Saperavi'),
  red('Xinomavro'),
  red('Agiorgitiko'),
  red('Plavac Mali'),
  red('Mavrud'),

  // Germany & Austria – white
  white('Riesling', 'Weißer Riesling', 'Rheinriesling', 'Rhine Riesling'),
  white('Welschriesling', 'Riesling Italico', 'Olaszrizling'),
  white('Müller-Thurgau', 'Rivaner', 'Riesling-Silvaner', 'Riesling-Sylvaner', 'Riesling x Silvaner'),
  white('Silvaner', 'Grüner Silvaner', 'Sylvaner'),
  white('Grauburgunder', 'Grauer Burgunder', 'Pinot Gris', 'Pinot Grigio', 'Ruländer'),
  white('Weißburgunder', 'Weißer Burgunder', 'Pinot Blanc', 'Pinot Bianco'),
  white('Chardonnay'),
  white('Sauvignon Blanc', 'Sauvignon', 'Fumé Blanc', 'Muskat-Sylvaner'),
  white('Sauvignon Gris'),
  white('Gewürztraminer', 'Traminer', 'Roter Traminer'),
  white('Scheurebe'),
  white('Kerner'),
  white('Bacchus'),
  white('Gutedel', 'Chasselas', 'Fendant'),
  white('Muskateller', 'Gelber Muskateller', 'Muscat', 'Muscat Blanc', 'Moscato', 'Moscato Bianco', 'Moscatel', 'Muskat'),
  white('Muskat-Ottonel', 'Muscat Ottonel'),
  white('Grüner Veltliner', 'Veltliner'),
  // Distinct varieties that only share the word "Veltliner"
  white('Roter Veltliner'),
  white('Frühroter Veltliner', 'Malvasier'),
  white('Brauner Veltliner'),
  white('Auxerrois'),
  white('Elbling'),
  white('Ortega'),
  white('Huxelrebe'),
  white('Rieslaner'),
  white('Solaris'),
  white('Johanniter'),
  white('Cabernet Blanc'),
  white('Souvignier Gris'),
  white('Muscaris'),
  white('Sauvignac'),
  white('Bronner'),
  white('Rotgipfler'),
  white('Zierfandler'),
  white('Neuburger'),
  // France & international – white
  white('Chenin Blanc', 'Chenin'),
  white('Sémillon'),
  white('Viognier'),
  white('Marsanne'),
  white('Roussanne'),
  white('Muscadelle'),
  white('Melon de Bourgogne'),
  white('Aligoté'),
  white('Picpoul', 'Piquepoul'),
  white('Colombard'),
  white('Gros Manseng'),
  white('Petit Manseng'),
  white('Savagnin'),
  white('Grenache Blanc', 'Garnacha Blanca'),
  white('Grenache Gris'),
  white('Torrontés'),
  // Italy – white
  white('Trebbiano', 'Ugni Blanc'),
  white('Vermentino'),
  white('Garganega'),
  white('Fiano'),
  white('Greco'),
  white('Falanghina'),
  white('Arneis'),
  white('Cortese'),
  white('Glera'),
  white('Verdicchio'),
  white('Pecorino'),
  white('Grillo'),
  white('Catarratto'),
  white('Inzolia', 'Ansonica'),
  white('Ribolla Gialla', 'Ribolla'),
  white('Friulano', 'Tocai Friulano'),
  white('Malvasia'),
  // Spain & Portugal – white
  white('Albariño', 'Alvarinho'),
  white('Verdejo'),
  white('Godello'),
  white('Macabeo', 'Viura'),
  white('Xarel-lo', 'Xarel·lo', 'Xarello'),
  white('Parellada'),
  white('Airén'),
  white('Loureiro'),
  white('Arinto'),
  white('Encruzado'),
  // Eastern Europe & Eastern Mediterranean – white
  white('Furmint'),
  white('Hárslevelű'),
  white('Assyrtiko'),
  white('Rkatsiteli'),
  // Grapes the appellation list names (public/data/appellations.json)
  // Lugana: "Trebbiano di Lugana" is not the Trebbiano of Tuscany or Abruzzo
  white('Turbiana', 'Trebbiano di Lugana'),
  // Salice Salentino Aleatico: printed, it keeps the appellation's main grape (Negroamaro) out
  red('Aleatico'),
]

/**
 * Grape names that are also places. A hit is the place, not the grape, when the folded text right
 * before it matches `before` (on the same line, or at the end of the line above) or the text right
 * after it matches `after` – unless `keep` matches what follows.
 */
export type GrapePlace = { grape: string; before?: RegExp; after?: RegExp; keep?: RegExp }

export const GRAPE_PLACES: GrapePlace[] = [
  // "Vino Nobile / Rosso / Vin Santo di Montepulciano": the Tuscan town, the wine is Sangiovese.
  { grape: 'Montepulciano', before: /(?<![\p{L}])(di|de|del|da)$/u, keep: /^[\s']*d\s*'?\s*abruzzo/ },
  // "Saint-Laurent-Médoc", "Saint-Laurent-des-Arbres": French villages, not the grape.
  { grape: 'St. Laurent', after: /^-\p{L}|^\s+(du|des|de|d|sur|en|medoc)(?![\p{L}])/u },
]

export type Term<T> = { term: string; value: T; weak?: boolean }

/**
 * Sweetness terms in DE/EN/FR/IT/ES. Compound terms come first so "halbtrocken" never counts as
 * "trocken" and "demi-sec" never as "sec".
 *
 * Mapping to the four German levels: "feinherb" has no legal definition; in practice it is used
 * for wines in or just above the halbtrocken range, so it maps to `off_dry` (halbtrocken).
 * "mild" is a marketing word, not a legal term – it maps to `medium` (lieblich) and stays unsure.
 * Sparkling wine terms (brut, extra dry) map to `dry`, demi-sec to `off_dry`, doux to `sweet`.
 */
export const SWEETNESS_TERMS: Term<Sweetness>[] = [
  // off-dry
  { term: 'halbtrocken', value: 'off_dry' },
  { term: 'halb trocken', value: 'off_dry' },
  { term: 'feinherb', value: 'off_dry' },
  { term: 'demi sec', value: 'off_dry' },
  { term: 'abboccato', value: 'off_dry' },
  { term: 'semiseco', value: 'off_dry' },
  { term: 'semi seco', value: 'off_dry' },
  { term: 'semisecco', value: 'off_dry' },
  { term: 'semi secco', value: 'off_dry' },
  { term: 'off dry', value: 'off_dry' },
  { term: 'medium dry', value: 'off_dry' },
  { term: 'semi dry', value: 'off_dry' },
  // medium
  { term: 'lieblich', value: 'medium' },
  { term: 'amabile', value: 'medium' },
  { term: 'moelleux', value: 'medium' },
  { term: 'semidulce', value: 'medium' },
  { term: 'semi dulce', value: 'medium' },
  { term: 'medium sweet', value: 'medium' },
  { term: 'semi sweet', value: 'medium' },
  { term: 'demi doux', value: 'medium' },
  { term: 'mild', value: 'medium', weak: true },
  // dry (compounds before "dry"/"trocken")
  { term: 'extra brut', value: 'dry' },
  { term: 'brut nature', value: 'dry' },
  { term: 'extra trocken', value: 'dry' },
  { term: 'extra dry', value: 'dry' },
  { term: 'pas dose', value: 'dry' },
  { term: 'trocken', value: 'dry' },
  { term: 'dry', value: 'dry' },
  { term: 'secco', value: 'dry' },
  { term: 'seco', value: 'dry' },
  { term: 'sec', value: 'dry' },
  { term: 'brut', value: 'dry' },
  // sweet
  { term: 'suss', value: 'sweet' },
  { term: 'susse', value: 'sweet' },
  { term: 'suess', value: 'sweet' },
  { term: 'sweet', value: 'sweet' },
  { term: 'doux', value: 'sweet' },
  { term: 'dolce', value: 'sweet' },
  { term: 'dulce', value: 'sweet' },
]

/** Styles that are sweet by definition, used only when no sweetness term is printed. */
export const SWEET_STYLE_TERMS: string[] = [
  'trockenbeerenauslese', 'beerenauslese', 'eiswein', 'ice wine', 'icewine', 'sauternes', 'aszu',
  'late harvest', 'vendange tardive', 'selection de grains nobles', 'passito', 'ausbruch', 'recioto',
]

/**
 * Wine type terms. German compounds match as word endings ("Qualitätsschaumwein", "Winzersekt"),
 * marked with a leading "*". Sparkling terms win over colours ("Rosé Sekt" is sparkling).
 */
export const WINE_TYPE_TERMS: Term<WineType>[] = [
  { term: '*sekt', value: 'sparkling' },
  { term: '*schaumwein', value: 'sparkling' },
  { term: '*perlwein', value: 'sparkling' },
  { term: 'cremant', value: 'sparkling' },
  { term: 'champagne', value: 'sparkling' },
  { term: 'cava', value: 'sparkling' },
  { term: 'prosecco', value: 'sparkling' },
  { term: 'spumante', value: 'sparkling' },
  { term: 'frizzante', value: 'sparkling' },
  { term: 'franciacorta', value: 'sparkling' },
  // Collective mark of the Trento DOC (only bottle-fermented sparkling wine); "Trento" alone is also the town
  { term: 'trentodoc', value: 'sparkling' },
  { term: 'sparkling', value: 'sparkling' },
  { term: 'mousseux', value: 'sparkling' },
  { term: 'petillant', value: 'sparkling' },
  { term: 'pet nat', value: 'sparkling' },
  { term: 'petnat', value: 'sparkling' },
  { term: 'espumoso', value: 'sparkling' },
  { term: 'espumante', value: 'sparkling' },
  { term: 'cap classique', value: 'sparkling' },
  { term: 'metodo classico', value: 'sparkling' },
  { term: 'methode traditionnelle', value: 'sparkling' },
  { term: 'methode champenoise', value: 'sparkling' },
  { term: 'brut', value: 'sparkling' },
  { term: '*weissherbst', value: 'rose' },
  { term: '*rosewein', value: 'rose' },
  { term: 'rose', value: 'rose' },
  { term: 'rosato', value: 'rose' },
  { term: 'rosado', value: 'rose' },
  // Italian rosé of Lake Garda ("Bardolino Chiaretto")
  { term: 'chiaretto', value: 'rose' },
  { term: 'blush', value: 'rose' },
  { term: '*rotwein', value: 'red' },
  { term: 'rouge', value: 'red' },
  { term: 'rosso', value: 'red' },
  { term: 'tinto', value: 'red' },
  { term: 'red wine', value: 'red' },
  { term: 'red blend', value: 'red' },
  { term: 'red', value: 'red', weak: true },
  { term: '*weisswein', value: 'white' },
  { term: 'blanc', value: 'white' },
  { term: 'bianco', value: 'white' },
  { term: 'blanco', value: 'white' },
  { term: 'branco', value: 'white' },
  { term: 'white wine', value: 'white' },
  { term: 'white blend', value: 'white' },
  { term: 'white', value: 'white', weak: true },
]

/** Methods and appellations that are (almost) always one colour. Only a hint: never sure. */
export const WINE_TYPE_HINTS: Term<WineType>[] = [
  ...[
    'appassimento', 'amarone', 'ripasso', 'chianti', 'barolo', 'barbaresco', 'valpolicella', 'bardolino',
    'taurasi', 'salice salentino', 'ribera del duero', 'priorat', 'beaujolais', 'cotes du rhone',
    'chateauneuf du pape', 'rioja', 'bordeaux', 'medoc', 'haut medoc', 'saint emilion', 'pomerol', 'pauillac',
    'crianza',
  ].map((term) => ({ term, value: 'red' as const })),
  ...[
    'chablis', 'soave', 'gavi', 'sancerre', 'pouilly fume', 'vinho verde', 'frascati', 'orvieto', 'muscadet',
    'entre deux mers', 'rias baixas', 'rueda', 'lugana',
  ].map((term) => ({ term, value: 'white' as const })),
]

/** Taste descriptions printed on labels: lines made of these are never the wine's name. */
export const DESCRIPTOR_STEMS: string[] = [
  'frucht', 'fruit', 'aromat', 'harmon', 'samt', 'kraft', 'spritz', 'wurz', 'vollmundig', 'leicht', 'frisch',
  'fresh', 'elegan', 'mineral', 'saftig', 'cremig', 'weich', 'smooth', 'crisp', 'juicy', 'intens',
  'fragrant', 'blumig', 'duftig', 'lebendig', 'charmant', 'anmut', 'mild',
]

/**
 * Taste words in DE/EN/IT/FR/ES as they are spelled in a description ("Süß & fruchtig"). A label line
 * made only of these, sweetness terms and joining words is a taste description, never a name.
 * German inflections (-e, -er, -es, -em, -en) and Romance endings (fresco → fresca) are matched too.
 */
/** German taste words: only these take German endings ("würziger"), so "Fraise" is no "frais". */
export const GERMAN_TASTE_WORDS: string[] = [
  'fruchtig', 'frisch', 'samtig', 'mild', 'würzig', 'kräftig', 'mineralisch', 'spritzig', 'elegant', 'harmonisch',
  'vollmundig', 'rund', 'fein', 'saftig', 'aromatisch', 'süffig', 'weich', 'cremig', 'blumig', 'duftig', 'lebendig',
  'leicht', 'intensiv', 'komplex', 'filigran', 'schmelzig', 'ausgewogen', 'anmutig', 'charmant', 'feinfruchtig',
  'fruchtbetont', 'knackig', 'herb', 'gehaltvoll', 'dicht', 'nussig', 'rassig', 'feurig', 'kernig', 'seidig',
  'geschmeidig', 'erfrischend', 'animierend',
]

export const TASTE_WORDS: string[] = [
  ...GERMAN_TASTE_WORDS,
  // en
  'fruity', 'fresh', 'crisp', 'smooth', 'juicy', 'rich', 'aromatic', 'velvety', 'silky', 'round', 'mellow', 'light',
  'spicy', 'zesty', 'vibrant', 'lively', 'soft', 'creamy', 'floral', 'refreshing', 'balanced', 'complex', 'delicate',
  'intense', 'harmonious', 'supple', 'fragrant', 'mineral',
  // it
  'fruttato', 'fresco', 'morbido', 'vellutato', 'aromatico', 'armonico', 'rotondo', 'sapido', 'minerale', 'fragrante',
  'vivace', 'intenso', 'equilibrato', 'corposo', 'delicato', 'floreale', 'speziato', 'avvolgente', 'strutturato', 'elegante',
  // fr
  'fruité', 'frais', 'fraîche', 'souple', 'rond', 'soyeux', 'soyeuse', 'élégant', 'minéral', 'gouleyant', 'vif', 'vive',
  'léger', 'légère', 'aromatique', 'harmonieux', 'velouté', 'épicé', 'charnu', 'généreux', 'tendre', 'onctueux',
  'croquant', 'fondant',
  // es
  'afrutado', 'suave', 'sedoso', 'aterciopelado', 'aromático', 'equilibrado', 'redondo', 'goloso', 'frutal', 'ligero',
  'sabroso', 'especiado', 'untuoso',
]

/** Words that strengthen a taste word without being one: "sehr fein", "molto fresco". */
export const TASTE_FILLERS = new Set(['sehr', 'very', 'molto', 'tres', 'muy', 'ganz', 'so'])

/** Small words that join parts of a name or a list of grapes. */
export const CONNECTORS = new Set(['&', 'und', 'mit', 'and', 'with', 'et', 'e', 'y', 'avec', 'con', '+', '/', '-'])

/**
 * Winery keywords. `keep`: part of the name ("Château Margaux", "Weinbiet Manufaktur").
 * `strip`: a descriptor the app's "Weingut" field already says ("Weingut Dr. Loosen" → "Dr. Loosen"),
 * removed when a meaningful name remains. `prefix`/`suffix`: where a keyword printed on its own
 * line looks for the rest of the name (below / above).
 */
export type WineryKeyword = { term: string; keep: boolean; position: 'prefix' | 'suffix' }

export const WINERY_KEYWORDS: WineryKeyword[] = [
  { term: 'weingut', keep: false, position: 'prefix' },
  { term: 'weinhaus', keep: false, position: 'prefix' },
  { term: 'weinbau', keep: false, position: 'prefix' },
  { term: 'winzerhof', keep: false, position: 'prefix' },
  { term: 'weinhof', keep: false, position: 'prefix' },
  { term: 'winery', keep: false, position: 'suffix' },
  { term: 'wine estate', keep: false, position: 'suffix' },
  { term: 'estate', keep: false, position: 'suffix' },
  { term: 'wines', keep: false, position: 'suffix' },
  { term: 'vineyards', keep: true, position: 'suffix' },
  { term: 'winzergenossenschaft', keep: true, position: 'prefix' },
  { term: 'winzerkeller', keep: true, position: 'prefix' },
  { term: 'winzer', keep: true, position: 'prefix' },
  { term: 'weinkellerei', keep: true, position: 'suffix' },
  { term: 'kellerei', keep: true, position: 'suffix' },
  { term: 'manufaktur', keep: true, position: 'suffix' },
  { term: 'schloss', keep: true, position: 'prefix' },
  { term: 'domaine', keep: true, position: 'prefix' },
  { term: 'chateau', keep: true, position: 'prefix' },
  { term: 'maison', keep: true, position: 'prefix' },
  { term: 'clos', keep: true, position: 'prefix' },
  { term: 'tenuta', keep: true, position: 'prefix' },
  { term: 'cantina', keep: true, position: 'prefix' },
  { term: 'cantine', keep: true, position: 'prefix' },
  { term: 'castello', keep: true, position: 'prefix' },
  { term: 'fattoria', keep: true, position: 'prefix' },
  { term: 'podere', keep: true, position: 'prefix' },
  { term: 'cascina', keep: true, position: 'prefix' },
  { term: 'masseria', keep: true, position: 'prefix' },
  { term: 'azienda agricola', keep: true, position: 'prefix' },
  { term: 'conte', keep: true, position: 'prefix' },
  { term: 'conti', keep: true, position: 'prefix' },
  { term: 'marchese', keep: true, position: 'prefix' },
  { term: 'marchesi', keep: true, position: 'prefix' },
  { term: 'baron', keep: true, position: 'prefix' },
  { term: 'baronne', keep: true, position: 'prefix' },
  { term: 'bodega', keep: true, position: 'prefix' },
  { term: 'bodegas', keep: true, position: 'prefix' },
  { term: 'quinta', keep: true, position: 'prefix' },
  { term: 'herdade', keep: true, position: 'prefix' },
  { term: 'pere & fils', keep: true, position: 'suffix' },
  { term: '& fils', keep: true, position: 'suffix' },
  { term: '& sohn', keep: true, position: 'suffix' },
  { term: '& sohne', keep: true, position: 'suffix' },
  { term: 'e figli', keep: true, position: 'suffix' },
  { term: '& figli', keep: true, position: 'suffix' },
  { term: 'e hijos', keep: true, position: 'suffix' },
]

/**
 * Growing regions and countries. A line made only of these is the origin, not the wine's name
 * ("WÜRTTEMBERG", "Rheinhessen"). French and Italian appellations are left out on purpose: there
 * the appellation often is the name ("Bordeaux", "Chianti Classico").
 */
export const REGIONS = new Set([
  'ahr', 'baden', 'franken', 'hessische bergstrasse', 'mittelrhein', 'mosel', 'nahe', 'pfalz', 'rheingau',
  'rheinhessen', 'saale unstrut', 'sachsen', 'wurttemberg', 'wachau', 'kamptal', 'kremstal', 'traisental',
  'wagram', 'weinviertel', 'thermenregion', 'carnuntum', 'burgenland', 'steiermark', 'sudsteiermark',
  'deutschland', 'germany', 'osterreich', 'austria', 'italia', 'italy', 'france', 'espana', 'spain', 'portugal',
  'hungary', 'magyarorszag', 'schweiz', 'suisse',
])

/** Headline words that are neither the name nor the producer ("SEIT 1856", "THE ORIGINAL"). */
export const NOT_A_NAME = new Set([
  'seit', 'since', 'depuis', 'dal', 'desde', 'est', 'gegrundet', 'founded', 'fondata', 'the original', 'original',
  'like no other', 'edition', 'limited edition',
])

/** Bottler phrases in the small print; what follows is usually the winery. */
export const BOTTLER_PREFIXES: string[] = [
  'erzeugerabfullung', 'gutsabfullung', 'abfuller', 'abgefullt von', 'abgefullt durch', 'abgefullt bei',
  'produced and bottled by', 'bottled by', 'produced by', 'prodotto e imbottigliato da', 'imbottigliato da',
  'imbottigliato all origine da', 'mis en bouteille par', 'embotellado por', 'elaborado y embotellado por',
]

/** Bottling notes in the small print; the producer's name and address follow them. Folded text. */
export const BOTTLING_NOTE = /mise? en bouteille|bouteille|(^| )mise? [ei]n b[o0]|imbottigl|embotellad|bottled|abgefullt|abfuller|abfullung|erzeuger/

/** Bottling or producer notes: grape names after them are the producer's name or town ("Weingut Kerner"). */
export const PRODUCER_NOTE = new RegExp(`${BOTTLING_NOTE.source}|produced by|produit par|prodotto da|elaborado por|hergestellt (von|durch|bei)`)

/** Web, mail and phone: contact data, never the wine. */
export const CONTACT_NOTE = /www|https?|@|\.(de|com|it|fr|es|at|eu|net)\b|\btel\b|\bfax\b|\btelefon\b/

/**
 * Medals, competitions and ratings ("DLG Gold 2024", "Landesweinprämierung", "Concours Mondial"):
 * their year is never the vintage. Folded text.
 */
export const AWARD_NOTE =
  /(?<![\p{L}])(gold|goldene?|silber|silberne?|silver|bronze|trophy|trophee|trofeo|awards?|concours|concorso|concurso|competition|challenge|wettbewerb|decanter|dlg|mundus|iwsc|iwc|falstaff|punkte|points|punti|winner|champion|premio|prix|preis)(?![\p{L}])|medail|medal|medagl|pramier|ehrenpreis|preismunze|sieger(?![\p{L}])|auszeichnung|ausgezeichnet/u

/**
 * Small print that never names the wine: appellations, legal categories, bottler notes, allergens,
 * alcohol and volume, lot numbers and contact data. Matched on folded text.
 */
export const LEGAL_PATTERNS: RegExp[] = [
  /denominazione|denominacion|denominacao|appellation|indicazione geografica|indicacion geografica/,
  // Also the fragments OCR leaves of them ("MINAZIONE py ORIGINEG", "Qualitatswem").
  /nominazion|minazione|nazion|origine|origen|controlee|protegee|controllat|rollata|garantit|garani|protett|calificad|ificada/,
  /qualitat|pradikat|landwein|deutscher wein|wein aus deutschland|osterreichischer wein|wein aus osterreich/,
  /vin de france|vino d ?italia|vino de espana|vin de pays|vino da tavola|tafelwein|vino de la tierra|vinho regional/,
  /product of|produce of|produit de|prodotto in|producto de|made in|wine of/,
  BOTTLING_NOTE,
  /sulfit|solfiti|sulphit|allergen|enthalt|contains|contient|contiene/,
  /\d\s*%|% ?vol|\balc\b|\bvol\b/,
  /\b\d+[.,]?\d*\s*(ml|cl|l|ltr|liter)\b/,
  /\ba\.? ?p\.? ?-? ?nr|\bapnr|prufungsnummer|\blot\b|\blotto\b/,
  CONTACT_NOTE,
]

/** Appellation tokens removed from a name line ("Chianti Classico DOCG" → "Chianti Classico"). Case-sensitive. */
export const APPELLATION_TOKENS = /(^|[^\p{L}])(D\.?O\.?C\.?G\.?|D\.?O\.?C\.?a?\.?|D\.?O\.?P\.?|I\.?G\.?T\.?|I\.?G\.?P\.?|A\.?O\.?C\.?|A\.?O\.?P\.?|D\.?O\.?|VDP|QbA)(?=$|[^\p{L}])/gu

// --- criteria terms (parse-label.ts "criteria") -------------------------------------------------

/**
 * "Blanc de Noirs" (white wine from red grapes) and "Blanc de Blancs": the wine is white, whatever
 * the grape. Tolerant of OCR: separators may be missing or doubled ("Blanc-de-Noirs",
 * "BLANCDENOIRS"), the plural "s" may be missing, and 0/o, 1/l/i and 5/s may be swapped.
 * Matched on folded text (lowercase, no accents).
 */
export const BLANC_DE_PATTERN = /(?<![\p{L}\p{N}])b[l1i]anc[\s\-'·.]*d[e3][\s\-'·.]*(n[o0][i1l|]r|b[l1i]anc)[s5]?(?![\p{L}\p{N}])/gu

/**
 * How a grape is called in the appellation's country, where that differs from the canonical
 * (mostly German) name in GRAPES: Sancerre Rouge is "Pinot Noir", not "Spätburgunder". Used for
 * grapes that come from the appellation list, never for grapes printed on the label (those keep
 * the label's spelling). `*` is the name for every country without an own entry.
 */
export const ORIGIN_GRAPE_NAMES: Record<string, Record<string, string>> = {
  Spätburgunder: { DE: 'Spätburgunder', AT: 'Blauburgunder', IT: 'Pinot Nero', '*': 'Pinot Noir' },
  Grauburgunder: { DE: 'Grauburgunder', AT: 'Grauburgunder', IT: 'Pinot Grigio', '*': 'Pinot Gris' },
  Weißburgunder: { DE: 'Weißburgunder', AT: 'Weißburgunder', IT: 'Pinot Bianco', '*': 'Pinot Blanc' },
  Schwarzriesling: { DE: 'Schwarzriesling', AT: 'Schwarzriesling', '*': 'Pinot Meunier' },
  Lemberger: { DE: 'Lemberger', HU: 'Kékfrankos', '*': 'Blaufränkisch' },
  Trollinger: { DE: 'Trollinger', IT: 'Schiava', '*': 'Trollinger' },
  Gutedel: { DE: 'Gutedel', CH: 'Chasselas', FR: 'Chasselas', '*': 'Gutedel' },
  Muskateller: { DE: 'Muskateller', AT: 'Muskateller', IT: 'Moscato', ES: 'Moscatel', PT: 'Moscatel', '*': 'Muscat' },
  Silvaner: { FR: 'Sylvaner', '*': 'Silvaner' },
  Welschriesling: { IT: 'Riesling Italico', HU: 'Olaszrizling', '*': 'Welschriesling' },
  Grenache: { ES: 'Garnacha', IT: 'Cannonau', '*': 'Grenache' },
  Mourvèdre: { ES: 'Monastrell', '*': 'Mourvèdre' },
  Carignan: { ES: 'Cariñena', IT: 'Carignano', '*': 'Carignan' },
  Tempranillo: { PT: 'Tinta Roriz', '*': 'Tempranillo' },
  Albariño: { PT: 'Alvarinho', '*': 'Albariño' },
  Trebbiano: { FR: 'Ugni Blanc', '*': 'Trebbiano' },
  'Grenache Blanc': { ES: 'Garnacha Blanca', '*': 'Grenache Blanc' },
}
