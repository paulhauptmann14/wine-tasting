import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/legal-page'
import { OPERATOR, PRIVACY_POLICY_DATE } from '@/lib/legal'
import { RETENTION_DAYS } from '@/lib/tasting/retention'

export const metadata: Metadata = { title: 'Datenschutz · Wine Tasting' }

export default function DatenschutzPage() {
  return (
    <LegalPage title="Datenschutz">
      <p>
        Wine Tasting speichert nur, was für eine Weinverkostung nötig ist. Es gibt keine Konten, keine E-Mail-Adressen und
        keine Passwörter.
      </p>

      <h2>Verantwortlich</h2>
      <p>
        {OPERATOR.name}, {OPERATOR.street}, {OPERATOR.city}, Deutschland
        <br />
        E-Mail: <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>
      </p>

      <h2>Was gespeichert wird</h2>
      <ul>
        <li>
          <strong>Beim Erstellen eines Tastings:</strong> der Name der Verkostung und eine freiwillige Beschreibung, die Weine mit ihren Angaben, die
          Bewertungskriterien und die Admin-PIN – die PIN nur verschlüsselt (als Hash), nie im Klartext.
        </li>
        <li>
          <strong>Von Gästen:</strong> der selbst gewählte Name, die vergebenen Sterne und freiwillige Notizen. Ein
          Spitzname genügt.
        </li>
      </ul>
      <p>
        Zweck ist allein die Durchführung der Verkostung. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Nutzung des
        Dienstes, den du aufrufst). Notizen werden erst nach dem Ende der Verkostung angezeigt und dann ohne Namen.
      </p>

      <h2>Wie lange</h2>
      <ul>
        <li>
          Jedes Tasting wird <strong>{RETENTION_DAYS} Tage nach dem Erstellen automatisch gelöscht</strong> – mit allen
          Weinen, Gästen, Bewertungen und Notizen.
        </li>
        <li>Der Gastgeber kann das Tasting oder einzelne Gäste jederzeit vorher löschen.</li>
        <li>Die Anmeldung auf deinem Gerät läuft für Gäste nach 30 Tagen ab, für die Verwaltung nach 7 Tagen.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        Es werden nur technisch notwendige Cookies gesetzt (§ 25 Abs. 2 Nr. 2 TDDDG), dafür ist keine Einwilligung
        nötig. Es gibt keine Werbe- oder Tracking-Cookies.
      </p>
      <ul>
        <li>
          <code>wt_p_…</code> – hält dich als Gast in einem Tasting angemeldet (30 Tage).
        </li>
        <li>
          <code>wt_a_…</code> – hält dich nach Eingabe der PIN in der Verwaltung angemeldet (7 Tage).
        </li>
        <li>
          <code>wt_theme</code> – merkt sich, ob du das helle oder dunkle Design gewählt hast (1 Jahr).
        </li>
      </ul>

      <h2>Hosting und Server-Protokolle</h2>
      <p>
        Die App läuft bei Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, USA. Die Server, die deine
        Anfragen verarbeiten, stehen in Dublin (EU). Beim Aufruf verarbeitet Vercel technisch nötige Daten wie
        IP-Adresse, Zeitpunkt, aufgerufene Adresse und Browser, um die Seite auszuliefern und vor Missbrauch zu schützen
        (Art. 6 Abs. 1 lit. f DSGVO). Vercel ist nach dem EU-US Data Privacy Framework zertifiziert, damit ist eine
        Übermittlung in die USA durch einen Angemessenheitsbeschluss abgesichert (Art. 45 DSGVO). Mehr dazu:{' '}
        <a href="https://vercel.com/legal/privacy-notice">Datenschutzhinweise von Vercel</a>.
      </p>

      <h2>Datenbank</h2>
      <p>
        Die Daten der Tastings liegen in einer Datenbank von Supabase Inc. mit Serverstandort in Irland (EU). Supabase
        verarbeitet sie in meinem Auftrag (Art. 28 DSGVO). Soweit Supabase Daten in Länder außerhalb der EU übermittelt,
        geschieht das auf Grundlage von Standardvertragsklauseln (Art. 46 DSGVO). Mehr dazu:{' '}
        <a href="https://supabase.com/privacy">Datenschutzerklärung von Supabase</a>.
      </p>

      <h2>Reichweitenmessung</h2>
      <p>
        Um zu sehen, welche Seiten genutzt werden, verwende ich Vercel Web Analytics. Es setzt keine Cookies und bildet
        keine Profile. Pro Seitenaufruf werden die Seite (ohne Tasting-Code), Zeitpunkt, vorherige Seite, ungefährer
        Standort (Land und Region), Betriebssystem, Browser und Gerätetyp erfasst. Besuche werden über einen Hash aus der
        Anfrage gezählt, der nach 24 Stunden verworfen wird; ausgewertet werden nur zusammengefasste Zahlen.
        Rechtsgrundlage ist mein berechtigtes Interesse, die App zu verbessern (Art. 6 Abs. 1 lit. f DSGVO). Du kannst
        dem per E-Mail widersprechen.
      </p>

      <h2>Etikett scannen</h2>
      <p>
        Wenn du beim Anlegen eines Weins „Etikett scannen“ tippst, wählst du über die Auswahl deines Geräts ein Foto
        (Kamera, Fotos oder Dateien). Die App liest den Text direkt auf deinem Gerät. Das Foto wird nicht hochgeladen und
        nicht gespeichert; übernommen wird nur, was du danach im Formular speicherst.
      </p>
      <p>
        Beim ersten Scan lädt dein Browser die Texterkennung (tesseract.js) mit den Sprachdaten und Listen mit
        Weingütern, Herkunftsbezeichnungen und Weinlagen, zusammen rund 10 MB. Alles kommt von diesem Server, es gibt
        keine Verbindung zu Dritten. Die Dateien können im normalen Browser-Cache liegen, damit sie nicht erneut geladen
        werden; du kannst ihn jederzeit in den Browser-Einstellungen leeren. Der Abgleich läuft auf deinem Gerät. Die
        Listen enthalten Daten von <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> (©
        OpenStreetMap-Mitwirkende, Lizenz <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL 1.0</a>) und
        weiteren offenen Quellen; sie sind im <Link href="/impressum">Impressum</Link> aufgeführt.
      </p>

      <h2>Schriften</h2>
      <p>Alle Schriften werden von dieser App selbst ausgeliefert. Es besteht keine Verbindung zu Google Fonts.</p>

      <h2>Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und
        Widerspruch (Art. 15–21 DSGVO). Schreib dazu einfach an{' '}
        <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>. Weil es keine Konten gibt, nenne bitte den Code des
        Tastings und den Namen, den du dort verwendet hast.
      </p>
      <p>
        Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel beim Bayerischen
        Landesamt für Datenschutzaufsicht, Promenade 18, 91522 Ansbach.
      </p>

      <p className="mt-6 text-sm text-muted-foreground">
        Stand: {PRIVACY_POLICY_DATE} · <Link href="/impressum">Impressum</Link>
      </p>
    </LegalPage>
  )
}
