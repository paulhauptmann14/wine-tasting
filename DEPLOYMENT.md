# Deployment

Die App braucht nur Node.js, PostgreSQL und die [Umgebungsvariablen](DEVELOPMENT.md#umgebungsvariablen). Es gibt zwei vorbereitete Wege; der Code ist für beide derselbe.

Wer die App öffentlich betreibt, trägt in `src/lib/legal.ts` die eigenen Betreiberdaten für Impressum und Datenschutzerklärung ein und prüft die Texte unter `src/app/impressum` und `src/app/datenschutz`.

## Variante A: Vercel + Supabase (empfohlen)

1. **Supabase-Projekt** anlegen (Free Plan, Region z. B. Frankfurt).
2. Unter *Project Settings → Database → Connection string* zwei URLs kopieren:
   - **Transaction Pooler** (Port 6543) → wird `DATABASE_URL` in Vercel
   - **Session Pooler** (Port 5432) → nur für Migrationen
3. **Migrationen** beim ersten Mal von deinem Rechner aus anwenden:
   ```bash
   MIGRATION_DATABASE_URL="<session-pooler-url>" npm run db:migrate:prod
   ```
4. **Vercel:** Repository importieren (Framework wird erkannt) und unter *Settings → Environment Variables* setzen:
   - `DATABASE_URL` = Transaction-Pooler-URL
   - `SESSION_SECRET` = Ausgabe von `openssl rand -base64 48`
   - `APP_URL` = `https://<deine-domain>` (für die QR-Codes)
   - `MIGRATION_DATABASE_URL` = Session-Pooler-URL – **nur für Production**, nicht für Preview
   - `CRON_SECRET` = Ausgabe von `openssl rand -hex 32` – **nur für Production**
5. Deployen. Danach wendet jeder Production-Deploy neue Migrationen vor dem Build selbst an (`buildCommand` in `vercel.json`); schlägt das fehl, bricht der Deploy ab und die alte Version bleibt online. Preview-Deploys ohne die Variable überspringen den Schritt.

**Aufräumen:** Ein Vercel Cron Job ruft jeden Tag gegen 3 Uhr UTC `/api/cron/purge` auf und löscht Tastings, die älter als 90 Tage sind, sowie abgelaufene Sessions (`crons` in `vercel.json`). Vercel schickt dabei `CRON_SECRET` mit; fehlt die Variable, lehnt die Route ab – im Log unter *Schedules → Cron Jobs* steht dann 401. Ist das Projekt pausiert, läuft auch der Job nicht; er holt das Löschen nach dem Fortsetzen beim nächsten Lauf nach. Unabhängig davon ist ein abgelaufenes Tasting ab Tag 90 nicht mehr aufrufbar.

Weil die Migration vor dem Umschalten läuft, arbeitet die alte Version kurz mit dem neuen Schema. Migrationen deshalb nur additiv halten; Spalten löschen oder umbenennen in zwei Deploys aufteilen.

Die Server-Funktionen laufen in **Dublin** (`dub1`, festgelegt in `vercel.json`), nah an einer Supabase-Datenbank in `eu-west-1`. Liegt die Datenbank in einer anderen Region, dort die passende Vercel-Region eintragen (z. B. `fra1` für Frankfurt).

Supabase pausiert Free-Projekte nach längerer Inaktivität – vor einem Tasting-Abend einmal die App öffnen bzw. das Projekt im Dashboard wieder aktivieren. Alle Tabellen haben Row Level Security ohne Policies, die öffentliche Supabase-API gibt also nichts preis.

Bei einem öffentlichen Repository in Vercel die *Git Fork Protection* eingeschaltet lassen, damit Pull Requests aus Forks nicht ungefragt mit den Preview-Variablen deployen.

## Variante B: Docker, z. B. auf dem Raspberry Pi

Voraussetzungen: Raspberry Pi 4 (≥ 4 GB) oder Pi 5 mit 64-Bit-OS, Docker mit Compose-Plugin, die Datenbank auf einer **SSD** (nicht auf der SD-Karte). Für den Zugriff von außen eine Domain bei Cloudflare.

```bash
git clone <repo> wine-tasting && cd wine-tasting
cp .env.production.example .env.production   # Werte eintragen, DB_DATA_DIR auf die SSD zeigen lassen
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Der Stack besteht aus:

| Dienst | Aufgabe |
|---|---|
| `db` | Postgres 17, Daten in `DB_DATA_DIR` |
| `migrate` | wendet beim Start einmal alle Migrationen an und beendet sich |
| `app` | Next.js-Standalone-Server, nur lokal auf `127.0.0.1:APP_PORT` erreichbar |
| `tunnel` | optional: Cloudflare Tunnel für HTTPS von außen, ohne Portfreigabe |

**Von außen erreichbar machen (HTTPS):** In Cloudflare *Zero Trust → Networks → Tunnels* einen Tunnel anlegen, als Public Hostname z. B. `wein.example.de` → `http://app:3000` eintragen, das Token in `.env.production` als `TUNNEL_TOKEN` setzen, `APP_URL=https://wein.example.de` setzen und mit Profil starten:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production --profile tunnel up -d --build
```

HTTPS ist nötig: In Produktion setzt die App ihre Cookies nur über sichere Verbindungen. Über eine reine LAN-Adresse (`http://192.168…`) funktionieren Beitreten und Admin-Login deshalb nicht.

**Update:** `git pull` und denselben `up -d --build`-Befehl erneut ausführen – Migrationen laufen automatisch.

**Backup** der Datenbank:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec db pg_dump -U wine wine_tasting > backup-$(date +%F).sql
```
