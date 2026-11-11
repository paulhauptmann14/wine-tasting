# 🍷 Wine Tasting

Webapp für private Weinverkostungen mit Freunden – gemacht fürs Handy am Tisch, mit Laptop- und Tablet-Ansicht für den Gastgeber.

Der Gastgeber erstellt ein Tasting, trägt die Weine ein und zeigt einen QR-Code. Gäste treten nur mit ihrem Namen bei – ohne Konto, ohne Passwort – und vergeben pro Wein und Kriterium 1–5 Sterne. Das Ranking läuft live mit; bei einer Blindverkostung erscheinen die Weinnamen erst am Ende.

<!-- Phone screenshots follow GitHub's light/dark theme -->
<p>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/screenshots/bewerten-dunkel.png">
    <img src=".github/screenshots/bewerten.png" alt="Einen Wein bewerten: Sterne pro Kriterium und eine Notiz" width="300">
  </picture>
  &nbsp;
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/screenshots/ergebnis-dunkel.png">
    <img src=".github/screenshots/ergebnis.png" alt="Endergebnis mit Podest und Button zum Teilen als Bild" width="300">
  </picture>
</p>

<img src=".github/screenshots/ergebnis-laptop-dunkel.png" alt="Endergebnis auf dem Laptop im Dunkelmodus" width="720">

## Funktionen

- **Tasting erstellen** mit Name, optionaler Blindverkostung, Bewertungssystem und Admin-PIN
- **Bewertungssysteme:** Einfach (ein Gesamturteil), 5-, 20- oder 100-Punkte-Schema mit gewichteten Kriterien – die App erklärt, wie gerechnet wird
- **Weine** mit Name, Jahrgang, Rebsorte, Weinart und Süße; die Reihenfolge lässt sich auch während des Abends ändern; „Reihenfolge mischen“ mischt nur Weine, die noch niemand bewertet hat
- **Einladen** per QR-Code, Link oder 6-stelligem Code
- **Bewerten** mit Sternen und optionaler Notiz; auf dem Handy wischt man zwischen den Weinen
- **Ergebnisse** live mit Podest, Durchschnitt je Kriterium und – nach dem Ende – den Notizen aller Gäste ohne Namen
- **Ergebnis als Bild** zum Teilen, z. B. in WhatsApp – mit Podest und allen Plätzen
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
