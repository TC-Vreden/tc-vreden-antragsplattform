# Codex-Arbeitsbremse fuer dieses Projekt

Damit lange unklare Warteschleifen vermieden werden, gilt fuer weitere Arbeitsbloecke:

1. Lange Befehle nur mit bewusst gesetztem Timeout starten.
2. Fuer normale Pruefungen zuerst `tsc --noEmit --incremental false` nutzen, kein langer Build ohne ausdruecklichen Grund.
3. Wenn ein Befehl deutlich laenger dauert als erwartet, abbrechen, Ursache pruefen und den naechsten kleineren Check waehlen.
4. Bei Aufgaben mit Deployment, Tests oder laengerer Wartezeit zwischendurch kurz Status melden.
5. Nach Abschluss oder erkennbarem Blocker eine Handy-Nachricht ueber `notify-phone.cmd` senden.
6. Bei eBuSy-Livetests nur kleine, eindeutig markierte Testdatensaetze schreiben und die Loeschpflicht sichtbar dokumentieren.

Diese Notiz ist eine Arbeitsregel fuer die Zusammenarbeit, keine produktive App-Logik.
