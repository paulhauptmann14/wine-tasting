import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal-page'
import { OPERATOR } from '@/lib/legal'

export const metadata: Metadata = { title: 'Impressum · Wine Tasting' }

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum">
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        {OPERATOR.name}
        <br />
        {OPERATOR.street}
        <br />
        {OPERATOR.city}
        <br />
        Deutschland
      </p>
      <h2>Kontakt</h2>
      <p>
        E-Mail: <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>
      </p>
      <p className="text-muted-foreground">
        Wine Tasting ist ein privates, nicht kommerzielles Projekt. Es gibt keine Werbung und keine kostenpflichtigen
        Angebote.
      </p>
      <h2>Datenquellen</h2>
      <p>
        Für „Etikett scannen“ und die Vorschläge im Wein-Formular nutzt die App die folgende Software und offene Daten.
        Die Listen liegen auf diesem Server. Die Daten wurden verändert: Aus den Quellen wurden nur Namen übernommen
        (bei Weinlagen zusätzlich Ort oder Region), Platzhalter wie „Weinbauflur ohne Riednamen“ wurden entfernt, die
        Schreibweise wurde vereinheitlicht (zum Beispiel Großbuchstaben in Groß- und Kleinschreibung), und bei einigen
        Herkunftsbezeichnungen wurde die Weinart ergänzt.
      </p>
      <ul>
        <li>
          Texterkennung: <a href="https://github.com/naptha/tesseract.js">tesseract.js</a> mit den Sprachdaten aus{' '}
          <a href="https://github.com/tesseract-ocr/tessdata_fast">tessdata_fast</a>, Lizenz Apache-2.0.
        </li>
        <li>
          Weingüter: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap-Mitwirkende</a>, Lizenz{' '}
          <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL 1.0</a>. Die Liste ist eine abgeleitete
          Datenbank und wird ebenfalls unter der ODbL 1.0 angeboten.
        </li>
        <li>
          Weingüter: <a href="https://www.wikidata.org/">Wikidata</a>, Lizenz{' '}
          <a href="https://creativecommons.org/publicdomain/zero/1.0/deed.de">CC0 1.0</a>.
        </li>
        <li>
          Herkunftsbezeichnungen: © Europäische Union,{' '}
          <a href="https://ec.europa.eu/agriculture/eambrosia/geographical-indications-register/">eAmbrosia</a>, das
          Register der geografischen Angaben der EU (Weiterverwendung nach dem Beschluss 2011/833/EU der Kommission,
          vergleichbar mit <a href="https://creativecommons.org/licenses/by/4.0/deed.de">CC BY 4.0</a>). Daten
          verändert: nur Namen übernommen, Weinart bei einigen Bezeichnungen ergänzt.
        </li>
        <li>
          Weinlagen Rheinland-Pfalz: Weinbergsrolle Einzellagen, Landwirtschaftskammer Rheinland-Pfalz (2020),{' '}
          <a href="https://weinlagen.lwk-rlp.de/">Datensatz</a>, Lizenz{' '}
          <a href="https://www.govdata.de/dl-de/by-2-0">Datenlizenz Deutschland – Namensnennung – Version 2.0</a>{' '}
          (dl-de/by-2-0). Daten verändert: nur Name, Ort und Region übernommen, ohne Geometrie.
        </li>
        <li>
          Weinlagen Niederösterreich: Weinbau Rieden, © Land Niederösterreich,{' '}
          <a href="https://creativecommons.org/licenses/by/4.0/deed.de">CC BY 4.0</a>. Daten verändert: nur
          Riedname und Katastralgemeinde übernommen, Platzhalter entfernt.
        </li>
        <li>
          Weinlagen Südtirol: © Autonome Provinz Bozen – Südtirol, Open Data, Lizenz{' '}
          <a href="https://creativecommons.org/publicdomain/zero/1.0/deed.de">CC0 1.0</a>, Quelle trotzdem genannt.
          Daten verändert: nur Namen übernommen, Schreibweise vereinheitlicht.
        </li>
      </ul>
    </LegalPage>
  )
}
