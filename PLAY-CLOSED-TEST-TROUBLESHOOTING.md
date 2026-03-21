# PLAY CLOSED TEST TROUBLESHOOTING

Laatst gecontroleerd: 2026-03-16

## Huidige status

De release zelf lijkt live te zijn voor testers:

- gesloten test: `Alpha`
- app: `ALL-INN AJAX`
- opt-in link: `https://play.google.com/apps/test/com.allinmedia.allinajax/14`

Dus als testers nog `Item niet gevonden` krijgen, zit het meestal niet meer in de build zelf maar in de tester-configuratie.

## Wat officieel van Google telt

Volgens Google Play Console Help:

- bij een gesloten test moet je een testerlijst maken of kiezen
- die lijst moet echt aan de track gekoppeld zijn
- daarna moet je de deelbare testlink gebruiken
- de app is niet altijd vindbaar via gewone Play Store zoekresultaten
- een geuploade CSV overschrijft bestaande adressen
- CSV met UTF-8 BOM wordt niet geaccepteerd

Bron:
- https://support.google.com/googleplay/android-developer/answer/9845334

## Waarschijnlijkste oorzaken van `Item niet gevonden`

1. De tester staat niet echt in de gekoppelde testerslijst.
2. De verkeerde lijst is gekoppeld aan `Alpha`.
3. De lijst is aangepast, maar niet opgeslagen.
4. De tester opent de gewone storelink in plaats van de testlink.
5. De tester gebruikt iPhone in plaats van Android.
6. De tester opent met een ander Google-account dan verwacht.

## Snelle controle in Play Console

Ga naar:

`Testen en releasen > Gesloten test > Alpha > Testers`

Controleer daarna precies dit:

1. Onder `Testers` staat echt de juiste e-maillijst geselecteerd.
2. Na wijzigingen is op `Save changes` / `Opslaan` gedrukt.
3. De gedeelde link is echt:
   `https://play.google.com/apps/test/com.allinmedia.allinajax/14`
4. Er is geen oude of verkeerde lijst meer gekoppeld.

## Belangrijk over adressen

De mailinglijst en de Play-testlijst zijn niet altijd hetzelfde.

Als iemand een mail kan ontvangen, betekent dat nog niet automatisch dat de Play-test werkt.

Voor deze test zijn vooral de adressen met de grootste kans op succes:

- `all.inn.media.contact@gmail.com`
- `edwin3771@gmail.com`
- `aadje3@gmail.com`
- `dennisdevries5@gmail.com`
- `entaink187@gmail.com`
- `smitty1972.rs@gmail.com`
- `dorregeestralphenfiona@gmail.com`

Deze adressen eerst prioriteren als actieve Android-testers.

## Adressen die eerst gecontroleerd moeten worden

Deze kunnen prima echte mailadressen zijn, maar moeten extra gecontroleerd worden omdat gesloten tests daar vaker misgaan:

- `arthur.vandertol@hotmail.nl`
- `frankvannoort@hotmail.com`
- `djurre.manders@hotmail.com`
- `patries25-79@hotmail.com`
- `arnosmits1974@hotmail.com`

Van deze mensen moet je bevestigen:

- gebruiken ze Android
- openen ze de echte testlink
- en met welk Google-account zijn ze in Play Store ingelogd

## Beste tijdelijke aanpak

1. Laat eerst alleen de Android-testers met duidelijke werkende Google-accountadressen testen.
2. Laat iedereen exact dezelfde testlink gebruiken.
3. Vraag bij `Item niet gevonden` altijd om:
   - toesteltype
   - screenshot
   - het account dat in Play Store actief is
4. Pas daarna de testerslijst verder opschonen.
