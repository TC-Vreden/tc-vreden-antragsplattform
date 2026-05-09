# Testlabor- und Minderjaehrigen-Notizen

Stand: 09.05.2026

## eBuSy-Testlabor

Das eBuSy-Testlabor erzeugt fuer jeden Live-Testlauf eine eigene technische Lauf-ID.
Diese Lauf-ID wird in der internen Test-Antrags-ID, der Test-E-Mail-Adresse, dem
eBuSy-Benutzernamen und dem Kommentar verwendet. Dadurch koennen mehrere Tests
nacheinander laufen, ohne dass der eBuSy-Benutzername mit einem frueheren Testdatensatz
kollidiert.

Die im Testlabor angezeigte interne eBuSy-ID, z. B. `812`, ist nicht identisch mit der
sichtbaren Kundennummer im eBuSy-Backend, z. B. `0255`. Fuer API-Aufrufe wird die interne
eBuSy-ID verwendet. Fuer die manuelle Suche im Backend ist meistens die Kundennummer
oder der Name hilfreicher.

## Minderjaehrige, SEPA und spaetere PDF-Zusammenfassung

Wenn die Hauptperson selbst minderjaehrig ist, muessen der gesetzliche Vertreter und die
Zustimmung im digitalen Antrag dokumentiert werden. Diese Informationen werden nicht
automatisch vollstaendig als eigene Struktur in eBuSy erwartet. Deshalb muessen sie in der
spaeteren PDF-Zusammenfassung und in der Vereinskopie per E-Mail eindeutig enthalten sein.

Bei Familien- oder Erwachsener-plus-Kind-Antraegen ist die Hauptperson normalerweise eine
erwachsene Person. Minderjaehrige Zusatzpersonen werden separat im Antrag erfasst. Fuer den
spaeteren Freigabeprozess bleibt zu klaeren, ob die Hauptperson automatisch als gesetzlich
vertretungsberechtigt gelten darf oder ob pro minderjaehriger Zusatzperson ein eigener
Vertreter-/Zustimmungsnachweis benoetigt wird.

Empfehlung fuer das spaetere PDF:

- Hauptperson und Zusatzpersonen getrennt auffuehren.
- Minderjaehrige Personen klar markieren.
- gesetzliche Vertreter und Zustimmung mit Zeitstempel dokumentieren.
- SEPA-Daten und Kontoinhaber nachvollziehbar ausweisen.
- PDF an Antragsteller und als BCC/Kopie an das Vereinspostfach senden.
- eBuSy nur mit den Feldern befuellen, fuer die ein sicherer API-Schreibweg bestaetigt ist.

