# 🍷 Wine Tasting

Webapp für private Weinverkostungen mit Freunden – gemacht fürs Handy am Tisch, mit Laptop- und Tablet-Ansicht für den Gastgeber.

Der Gastgeber erstellt ein Tasting, trägt die Weine ein und zeigt einen QR-Code. Gäste treten nur mit ihrem Namen bei – ohne Konto, ohne Passwort – und vergeben pro Wein und Kriterium 1–5 Sterne. Das Ranking läuft live mit; bei einer Blindverkostung erscheinen die Weinnamen erst am Ende.

## Funktionen

- **Tasting erstellen** mit Name, optionaler Blindverkostung, Bewertungssystem und Admin-PIN
- **Bewertungssysteme:** Einfach (ein Gesamturteil), 5-, 20- oder 100-Punkte-Schema mit gewichteten Kriterien – die App erklärt, wie gerechnet wird
- **Weine** mit Name, Jahrgang, Rebsorte, Weinart und Süße; die Reihenfolge lässt sich auch während des Abends ändern
- **Einladen** per QR-Code, Link oder 6-stelligem Code
- **Bewerten** mit Sternen und optionaler Notiz; auf dem Handy wischt man zwischen den Weinen
- **Ergebnisse** live mit Podest, Durchschnitt je Kriterium und – nach dem Ende – den Notizen aller Gäste ohne Namen
- **Tisch-Ansicht** für iPad oder Fernseher: QR-Code zum Beitreten, Fortschritt, am Ende das Podest
- **Verwaltung** mit PIN, auch vom Handy eines Gastes aus
- **Hell und dunkel**, folgt dem System oder per Schalter

## Datenschutz

Keine Konten, keine E-Mail-Adressen, keine Werbung. Gespeichert wird nur, was für den Abend nötig ist: die Weine, selbst gewählte Namen, Sterne und Notizen. Jedes Tasting wird 90 Tage nach dem Erstellen automatisch gelöscht, auf Wunsch auch früher.

## Tech-Stack

Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 · shadcn/ui · Drizzle ORM · PostgreSQL · Zod · Vitest · PGlite · Playwright

Es gibt kein separates Backend: Seiten, Server-Logik und Datenbankzugriff laufen in Next.js. Der Browser spricht nie direkt mit der Datenbank.

## Selbst betreiben

- [DEVELOPMENT.md](DEVELOPMENT.md) – lokal starten, Tests, Projektstruktur, Sicherheit
- [DEPLOYMENT.md](DEPLOYMENT.md) – Vercel + Supabase oder Docker (z. B. auf dem Raspberry Pi)

## Lizenz

MIT – siehe [LICENSE](LICENSE).
