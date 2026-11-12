# Reference data sources

Data for the label scan (`src/components/admin/label-scan`). Names only, no addresses or geometry.
Data as of 2026-11-11 (eAmbrosia, sites, wineries) and 2026-11-12 (Wikidata appellation data, product specifications).
Rebuild: `node scripts/build-wineries.mjs` and `node scripts/build-reference-data.mjs [--cache <dir>]` (with a cache
directory the raw downloads are kept, so a rebuild gives the same file).

| File | Content | Entries | Size |
| --- | --- | --- | --- |
| `wineries.json` | `string[]` winery names worldwide | 16,584 | 371 KB (125 KB gzip) |
| `appellations.json` | `{ name, country, wineType?, grapes?, mainGrape?, sources? }[]` EU wine PDO/PGI | 1,612 (218 with wineType, 305 with grapes, 71 with mainGrape) | 101 KB (16 KB gzip) |
| `sites.json` | `{ name, village?, region }[]` official vineyard sites | 4,994 | 355 KB (40 KB gzip) |

## wineries.json

- OpenStreetMap, `craft=winery` with `name`, one Overpass query (https://overpass-api.de, base 2026-11-11).
  License ODbL 1.0 (https://opendatacommons.org/licenses/odbl/1-0/).
  Attribution: © OpenStreetMap contributors (https://www.openstreetmap.org/copyright).
- Wikidata, instances of winery (Q156362) or subclasses (without Q2262049 "cilla"), labels in de/en/fr/it/es,
  via the Wikidata Query Service. License CC0 1.0.
- The file itself is a derivative database of OpenStreetMap and is offered under the ODbL 1.0
  (© OpenStreetMap contributors) with the CC0 Wikidata labels mixed in. See `wineries.LICENSE.md`.

## appellations.json

- EU eAmbrosia, register of geographical indications (wine PDO/PGI, status "registered"),
  API https://webgate.ec.europa.eu/eambrosia-api/. License: European Commission reuse policy
  (Decision 2011/833/EU), i.e. CC BY 4.0 equivalent.
  Attribution: © European Union, eAmbrosia – the EU geographical indications register.
  Data changed: only names and country taken; `wineType`, `grapes`, `mainGrape` and `sources` added (see below).
- `wineType` only where the appellation allows exactly one colour:
  - names that imply the type unambiguously (`TYPE_RULES` in `scripts/build-reference-data.mjs`: Champagne,
    Prosecco, Cava, Crémant, Barolo, Chablis, Tavel, …),
  - Italian DOPs whose product specification (disciplinare) names one colour only (`IT_ONE_COLOUR`, 123 names,
    article 1 and the "colore" lines of article 6, no rosé type anywhere in the text), or only sparkling wine
    (Vernaccia di Serrapetrona); "Trento" (sparkling only) has no type because the word is mostly the town,
  - the verified rules (`VERIFIED`, see below),
  - Wikidata, only for an item with the same eAmbrosia ID that names exactly one colour (P462 or the
    class red/white/rosé/sparkling wine), when no other matched item, grape or the name says otherwise.
    In the current data this adds none (Wikidata has colours for very few appellations).
- `grapes`: typical grapes, most important first, as canonical names of `GRAPES` in
  `src/lib/label/dictionaries.ts`; at most 5. From `VERIFIED` where present, otherwise Wikidata.
- `mainGrape` (and `sources`): only from `VERIFIED`, checked by hand in the product specification: the rules
  require at least 85 % of that grape (the EU threshold for naming a single variety on the label) for every
  wine of the grape's colour, for every wine when `wineType` is set. Example: Sancerre has `mainGrape`
  "Sauvignon Blanc" (white wines 100 % Sauvignon, red and rosé 100 % Pinot Noir) and no `wineType`.
- Wikidata (https://www.wikidata.org/, CC0 1.0), via the Wikidata Query Service and `wbgetentities`:
  items with an eAmbrosia ID (P9854), wines (Q282 and subclasses) and items of the appellation classes
  (AOC, PDO, DOCG, DO, DOC, wine-producing region, PGI, …). Taken: labels and aliases (de/en/it/fr/es/pt),
  country (P17), grapes (P186 "made from material", ordered by the proportion qualifier P1107 where given,
  otherwise by statement order) and colour (P462). Matching to the eAmbrosia names: same eAmbrosia ID
  (406 items), otherwise exact label or alias after removing "DOC", "AOC", "wine", … in the same country
  (766 items). Grapes that are not in the dictionary are dropped; a grape whose name is the town in the
  appellation name ("Vin Santo di Montepulciano") is dropped.
- Product specifications read for `VERIFIED` and `IT_ONE_COLOUR` (public documents of the national
  authorities, used as facts; not redistributed):
  - Italy: MASAF, "Disciplinari di produzione vini DOP", consolidated texts as three archives (A–D, E–N, O–Z),
    https://www.masaf.gov.it/flex/cm/pages/ServeBLOB.php/L/IT/IDPagina/4625 (downloaded 2026-11-12; the archive
    links are in the script). The archive links change with every update, so `sources` links each appellation's
    own entry in eAmbrosia (`…/geographical-indications-register/details/<EUGI id>`).
  - France: INAO cahiers des charges, linked from the product pages on https://www.inao.gouv.fr – either
    the PDF on extranet.inao.gouv.fr (read from the Wayback Machine copy, the host is not reachable from
    here) or the text in the Bulletin officiel of the Ministry of Agriculture (info.agriculture.gouv.fr).
    The URL of each document is stored in `sources`.
  - Spain: eAmbrosia technical files and amendments (Rioja, Ribera del Duero, Rías Baixas, Rueda, Cava,
    Priorat); no Spanish appellation qualifies for `mainGrape`.
  - Austria: DAC-Verordnung „Weinviertel" (RIS, https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20006693):
    Grüner Veltliner – used for suggestions only, because "Weinviertel" alone is not always DAC wine.

## sites.json

- Rheinland-Pfalz (Mosel, Nahe, Rheinhessen, Pfalz, Ahr, Mittelrhein): Weinbergsrolle Einzellagen,
  © Landwirtschaftskammer Rheinland-Pfalz (2020), Datenlizenz Deutschland – Namensnennung – Version 2.0
  (dl-de/by-2-0, https://www.govdata.de/dl-de/by-2-0). Dataset: https://weinlagen.lwk-rlp.de/. Read from the
  OGC API mirror https://demo.ldproxy.net/vineyards (name, village, region; no geometry). Data changed:
  only name, village and region taken.
- Niederösterreich: Weinbau Rieden (`OGD:RLF_WEINBAU_RIEDEN`, WFS https://sdi.noe.gv.at/at.gv.noe.geoserver/OGD/wfs),
  © Land Niederösterreich, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Ried name and cadastral
  municipality (KGNAME) as village; placeholders ("Weinbauflur ohne Riednamen", "keine Subriede") removed.
  Data changed: only names and village taken.
- Südtirol: civis Open Data, WFS https://geoservices6.civis.bz.it/geoserver/p_bz-Agriculture, layers
  `VineyardMentions` (Bezeichnung Weingarten) and `AdditionalGeographicalLocations`, © Autonome Provinz Bozen – Südtirol,
  open data, CC0 1.0 (license_id `cc-zero` of both datasets on https://data.civis.bz.it, checked 2026-11; credited here as a courtesy).
  NAME_DE and NAME_IT, converted from upper case to title case (data changed: names only, spelling unified).

## Tesseract language data

`public/tesseract/lang`: tessdata_fast, Apache-2.0 (see `public/tesseract/README.md`).
