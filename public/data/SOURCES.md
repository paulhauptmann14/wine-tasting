# Reference data sources

Data for the label scan (`src/components/admin/label-scan`). Names only, no addresses or geometry.
Data as of 2026-11-11. Rebuild: `node scripts/build-wineries.mjs` and `node scripts/build-reference-data.mjs`.

| File | Content | Entries | Size |
| --- | --- | --- | --- |
| `wineries.json` | `string[]` winery names worldwide | 16,584 | 371 KB (125 KB gzip) |
| `appellations.json` | `{ name, country, wineType? }[]` EU wine PDO/PGI | 1,612 (90 with wineType) | 67 KB (12 KB gzip) |
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
  Data changed: only names and country taken, `wineType` added (see below).
- `wineType` is a hand-curated mapping in `scripts/build-reference-data.mjs` (`TYPE_RULES`), only for
  names that imply the type unambiguously (Champagne, Prosecco, Cava, Crémant, Asti, Franciacorta,
  Trento, Barolo, Chablis, Tavel, …). Ambiguous names have no type.

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
