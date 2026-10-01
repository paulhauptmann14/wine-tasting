# 🍷 Wine Tasting

Mobile Webapp für private Weinverkostungen mit Freunden.

Der Gastgeber erstellt ein Tasting, legt die Weine an und teilt einen QR-Code. Gäste treten nur mit ihrem Namen bei – ohne Account, ohne Passwort – und bewerten jeden Wein mit 1–5 Sternen pro Kriterium. Das Ranking ist live sichtbar; bei einer Blindverkostung werden die Weinnamen erst beim Beenden aufgelöst.

## Funktionen

- **Tasting erstellen** mit Name, Blindverkostung, Bewertungssystem (Einfach, Classic, Detailliert) und Admin-PIN
- **Einladen** per QR-Code, Link oder 6-stelligem Code
- **Beitreten** nur mit Namen; die App merkt sich Gäste per Cookie
- **Bewerten** mit Sternen pro Kriterium und optionaler Notiz („Was schmeckst du?“)
- **Live-Ergebnisse** mit Podest, weiteren Plätzen und Durchschnitt je Kriterium
- **Blindverkostung:** Gäste sehen nur „Wein #1“, die Namen erscheinen beim Beenden
- **Verwaltung** mit PIN: Weine, Kriterien, Teilnehmer, Status (Vorbereitung → Läuft → Beendet)
- **Hell- und Dunkelmodus** – folgt dem System, umschaltbar per Button
- Optimiert für **Smartphone und Laptop**

## Tech-Stack

Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 · shadcn/ui · Drizzle ORM · PostgreSQL · Zod · Vitest · PGlite · Playwright

Es gibt kein separates Backend: Seiten, Server-Logik und Datenbankzugriff laufen in Next.js. Der Browser spricht nie direkt mit der Datenbank.

## Lokal starten

Voraussetzungen: Node.js ≥ 20.9, Docker Desktop, Google Chrome (für die E2E-Tests).

```bash
npm install
cp .env.example .env.local
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

## Umgebungsvariablen

| Variable | Pflicht | Bedeutung |
|---|---|---|
| `DATABASE_URL` | ja | Postgres-Verbindung |
| `SESSION_SECRET` | ja | Schlüssel zum Signieren des Admin-Cookies, mind. 32 Zeichen |
| `APP_URL` | nein | Feste Basis-URL für QR-Codes; sonst aus dem Request-Host |
| `MIGRATION_DATABASE_URL` | nein | Abweichende Verbindung nur für `db:migrate` (z. B. Session-Pooler bei Supabase) |

## Tests

```bash
npm test          # Unit- und DB-Integrationstests (PGlite im Speicher, ohne Docker)
npm run e2e       # Playwright: kompletter Abend auf Handy- und Laptop-Größe
npm run lint
```

Die E2E-Tests bauen die App, starten sie auf Port 3100 und nutzen das installierte Google Chrome (`channel: 'chrome'`). Die Docker-Datenbank muss laufen.

## Datenbankschema ändern

1. `src/db/schema.ts` anpassen
2. `npm run db:generate -- --name <beschreibung>` – erzeugt eine SQL-Migration in `drizzle/`
3. `npm run db:migrate`

## Projektstruktur

```
src/
├── app/            Seiten und Server Actions
│   ├── page.tsx, new/, manage/          Start, Tasting erstellen, Admin-Login
│   └── tasting/[code]/                  Gäste: beitreten, Weine, Bewertung, Ergebnisse
│       └── admin/                       Verwaltung (Teilen, Allgemein, Weine, Bewertung, …)
├── components/     UI (Glasrand-Ring, Sterne, Ergebnisse, Admin-Editoren, shadcn/ui)
├── db/             Drizzle-Schema, DB-Client
├── server/         Datenbank-Logik (bekommt `db` als Parameter, getestet mit PGlite)
├── lib/            Reine Logik: Regeln, Ergebnisberechnung, Validierung, Auth-Bausteine
└── test/           Test-Helfer
drizzle/            SQL-Migrationen
e2e/                Playwright-Tests
```

## Sicherheit

- Gäste-Sessions: zufälliges Token im HttpOnly-Cookie, in der Datenbank nur als SHA-256-Hash
- Admin-PIN: mit scrypt gehasht; nach 5 Fehlversuchen 10 Minuten gesperrt
- Admin-Cookie: HMAC-signiert, 7 Tage gültig, nur für ein Tasting
- Blindverkostung: Weinnamen werden serverseitig zurückgehalten, nicht nur in der Oberfläche versteckt
- Row Level Security auf allen Tabellen (ohne Policies) – schützt vor Zugriffen über eine öffentliche Datenbank-API wie die von Supabase

## Deployment

Die App braucht nur Node.js, eine PostgreSQL-Datenbank und die Umgebungsvariablen oben. Das Ziel ist noch nicht festgelegt; beide Varianten sind möglich:

### Variante A: Vercel + Supabase

1. Supabase-Projekt anlegen (z. B. Region Frankfurt, Free Plan).
2. Unter *Project Settings → Database* die Verbindungs-URLs kopieren:
   - **Transaction Pooler** (Port 6543) → `DATABASE_URL` in Vercel
   - **Session Pooler** (Port 5432) → nur lokal für Migrationen
3. Migrationen ausführen:
   ```bash
   MIGRATION_DATABASE_URL="<session-pooler-url>" npm run db:migrate
   ```
4. Repository in Vercel importieren, `DATABASE_URL`, `SESSION_SECRET` und optional `APP_URL` setzen, deployen.

Hinweis: Supabase pausiert Free-Projekte nach längerer Inaktivität – vor einem Tasting-Abend einmal prüfen.

### Variante B: Raspberry Pi

- Raspberry Pi 4 (≥ 4 GB) oder Pi 5 mit 64-Bit-OS und Docker
- App und Postgres als Container (Next.js mit `output: 'standalone'`), Datenbank-Volume auf einer **SSD**, nicht auf der SD-Karte
- Erreichbarkeit mit HTTPS über **Cloudflare Tunnel** – nötig, weil die Cookies in Produktion nur über HTTPS gesetzt werden; keine Portfreigabe am Router
- Regelmäßige Backups mit `pg_dump`

Die genaue Anleitung für die gewählte Variante folgt, sobald die Entscheidung gefallen ist.
