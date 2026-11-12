# wineries.json

Namensliste von Weingütern weltweit (nur Namen, nur lateinische Schrift).

**Lizenz der Datei:** `wineries.json` ist eine abgeleitete Datenbank von OpenStreetMap und wird selbst unter der Open Database License (ODbL) 1.0 angeboten (© OpenStreetMap-Mitwirkende, https://opendatacommons.org/licenses/odbl/1-0/). Eingemischt sind Bezeichnungen aus Wikidata (CC0 1.0).

- Quelle 1: OpenStreetMap, Overpass-API (`craft=winery` mit `name`). Lizenz: Open Database License (ODbL) 1.0, https://opendatacommons.org/licenses/odbl/1-0/. Attribution: © OpenStreetMap-Mitwirkende (https://www.openstreetmap.org/copyright).
- Quelle 2: Wikidata, Objekte der Klasse „Weingut“ (Q156362) und Unterklassen, Bezeichnungen de/en/fr/it/es. Lizenz: CC0 1.0.
- Enthalten sind nur Namen, keine Adressen oder Koordinaten. Erzeugt mit `node scripts/build-wineries.mjs`. Details und Stand: `SOURCES.md`.
