# Entwicklung

## Lokal starten

Voraussetzungen: Node.js ≥ 20.12, Docker Desktop, Google Chrome (für die E2E-Tests).

```bash
npm install
cp .env.example .env.local
git config core.hooksPath .githooks   # Secret-Scan vor jedem Commit (braucht: brew install gitleaks)
```

In `.env.local` ein zufälliges `SESSION_SECRET` (mind. 32 Zeichen) eintragen, z. B. mit `openssl rand -base64 48`. Dann:

```bash
npm run db:up        # Postgres 17 in Docker auf localhost:54329
npm run db:migrate   # Tabellen anlegen
npm run dev          # http://localhost:3000
```

### Mit dem Handy testen

Im selben WLAN den Dev-Server für das Netzwerk öffnen und die Seite über die IP des Rechners aufrufen (z. B. `http://192.168.1.20:3000`). Der QR-Code in der Verwaltung enthält dann automatisch diese Adresse.

```bash
npm run dev -- -H 0.0.0.0
```

## Etikett-Scan

Der Code liegt in `src/components/admin/label-scan/` (Oberfläche, OCR im Browser) und `src/lib/label/` (Parser, Vorausfüllen, Abgleich). Worker, WASM-Core und Sprachdaten liegen selbst gehostet in `public/tesseract/`, die Referenzlisten in `public/data/`. Listen neu bauen: `node scripts/build-wineries.mjs` (Weingüter) und `node scripts/build-reference-data.mjs` (Herkunftsbezeichnungen samt Weinart und Rebsorten aus Wikidata und den geprüften Regeln `VERIFIED`/`IT_ONE_COLOUR` im Skript, dazu Lagen; `--only appellations|sites` baut nur eine Liste, `--cache <dir>` hebt die Rohantworten für einen gleichen Neubau auf). Tesseract aktualisieren: Schritte in `public/tesseract/README.md`.

## Umgebungsvariablen

| Variable | Pflicht | Bedeutung |
|---|---|---|
| `DATABASE_URL` | ja | Postgres-Verbindung |
| `SESSION_SECRET` | ja | Schlüssel zum Signieren des Admin-Cookies, mind. 32 Zeichen |
| `APP_URL` | nein | Feste Basis-URL für QR-Codes; sonst aus dem Request-Host |
| `MIGRATION_DATABASE_URL` | nein | Abweichende Verbindung nur für Migrationen (`db:migrate`, `db:migrate:prod`), z. B. Session-Pooler bei Supabase |
| `CRON_SECRET` | nein | Schützt den täglichen Aufräum-Job `/api/cron/purge`, mind. 16 Zeichen. Ohne die Variable antwortet die Route immer mit 401 |

## Tests

```bash
npm test          # Unit- und DB-Integrationstests (PGlite im Speicher, ohne Docker)
npm run e2e       # Playwright: kompletter Abend auf Handy-, Tablet- und Laptop-Größe
npm run lint
npx tsc --noEmit
```

Die E2E-Tests bauen die App, starten sie auf Port 3100 und nutzen das installierte Google Chrome (`channel: 'chrome'`). Die Docker-Datenbank muss laufen.

## Datenbankschema ändern

1. `src/db/schema.ts` anpassen
2. `npm run db:generate -- --name <beschreibung>` – erzeugt eine SQL-Migration in `drizzle/`
3. `npm run db:migrate`

Migrationen additiv halten – beim Deploy läuft die alte Version kurz gegen das neue Schema (siehe [DEPLOYMENT.md](DEPLOYMENT.md)).

Jede neue Fremdschlüssel-Spalte braucht einen Index, in dem sie vorn steht – Postgres legt keinen an, und ohne ihn durchsucht jedes Löschen per Kaskade die ganze Tabelle. `src/db/schema.test.ts` schlägt sonst fehl.

## Projektstruktur

```
src/
├── app/            Seiten und Server Actions
│   ├── page.tsx, new/, manage/          Start, Tasting erstellen, Admin-Login
│   ├── impressum/, datenschutz/         Rechtliches
│   ├── api/cron/purge/                  Aufräum-Job
│   ├── pwa-icon/                        App-Icons
│   └── tasting/[code]/                  Gäste: beitreten, Weine, Bewertung, Ergebnisse
│       ├── table/                       Tisch-Ansicht für iPad oder Fernseher
│       └── admin/                       Verwaltung (Teilen, Allgemein, Weine, Bewertung, …)
├── components/     UI (Glasrand-Ring, Sterne, Ergebnisse, Admin-Editoren, shadcn/ui)
├── db/             Drizzle-Schema, DB-Client
├── server/         Datenbank-Logik (bekommt `db` als Parameter, getestet mit PGlite)
├── lib/            Logik ohne DB-Schicht: Regeln, Ergebnisse, Validierung, Auth- und Session-Helfer
└── test/           Test-Helfer
drizzle/            SQL-Migrationen
e2e/                Playwright-Tests
```

## Sicherheit

- Gäste-Sessions: zufälliges Token im HttpOnly-Cookie, in der Datenbank nur als SHA-256-Hash
- Admin-PIN: mit scrypt gehasht; nach 5 Fehlversuchen gesperrt – erst 10 Minuten, jede weitere Sperre doppelt so lang (höchstens 24 Stunden), zurückgesetzt nach erfolgreichem Login (`src/lib/auth/pin-lockout.ts`). Der Versuch wird vor der Prüfung unter Zeilensperre gezählt, auch parallele Anfragen bekommen also höchstens 5 Prüfungen pro Sperrfenster.
- Admin-Cookie: HMAC-signiert, 7 Tage gültig, nur für ein Tasting
- Blindverkostung: Weinnamen werden serverseitig zurückgehalten, nicht nur in der Oberfläche versteckt
- Row Level Security auf allen Tabellen (ohne Policies) – schützt vor Zugriffen über eine öffentliche Datenbank-API wie die von Supabase
- Automatisches Löschen 90 Tage nach dem Erstellen (`src/lib/tasting/retention.ts`)
- Secrets bleiben aus dem Repo: Der Pre-Commit-Hook (`.githooks/pre-commit`) bricht Commits mit API-Keys, Tokens oder Datenbank-URLs mit Passwort ab; Regeln in `.gitleaks.toml`. Ganze Historie prüfen: `gitleaks git .`
