# E-mailová konfigurácia (SMTP)

Web odosiela všetky e-maily — potvrdenia objednávok, podklady na platbu prevodom,
upomienky, kontaktný formulár, uvítacie maily aj notifikácie adminovi — cez
**Microsoft 365**. Pošta domény `4frommedia.sk` beží tam, nie u WebSupportu,
aj keď je doména vedená vo WebSupport administrácii.

Zvláštnosť tohto nastavenia: **prihlasovacia schránka nie je odosielacia adresa.**
Prihlasuje sa `office@4frommedia.sk`, ale maily odchádzajú ako
`info@4frommedia.sk`. To funguje len vtedy, keď má prihlasovacia schránka
v Microsofte 365 udelené právo **Send as** na odosielaciu adresu.

## Env premenné

Nastavujú sa vo Vercel → Project → Settings → Environment Variables (a lokálne
v `.env.local`), pre Production aj Preview:

| Premenná        | Hodnota                                | Popis |
| --------------- | -------------------------------------- | ----- |
| `SMTP_HOST`     | `smtp.office365.com`                   | Odosielací server. |
| `SMTP_PORT`     | `587`                                  | STARTTLS. Microsoft 365 iný port neponúka. |
| `SMTP_SECURE`   | *(nenastavovať)*                       | Odvodí sa z portu: 587 → STARTTLS, 465 → implicitné TLS. |
| `SMTP_USER`     | `office@4frommedia.sk`                 | Prihlasovacia schránka. |
| `SMTP_PASSWORD` | *(heslo tejto schránky)*               | Nikdy nepatrí do repozitára. |
| `EMAIL_FROM`    | `VytlačTo3D <info@4frommedia.sk>`      | **Povinné**, keď sa login líši od odosielacej adresy. Bez neho by web odosielal pod `office@`. |

Súvisiace premenné:

- `ADMIN_ORDER_EMAIL` — interná schránka, do ktorej chodia notifikácie o nových
  objednávkach a správy z kontaktného formulára (default `info@4frommedia.sk`)
- `ADMIN_EMAILS` — čiarkou oddelený zoznam adries s prístupom do administrácie
- `SELLER_EMAIL` — kontaktná adresa na faktúrach (default `info@4frommedia.sk`)

## Odosielateľ aj prijímateľ

`info@4frommedia.sk` je zároveň odosielacia aj prijímacia adresa:

| Smer | Kde sa to deje |
| ---- | -------------- |
| **Odosielateľ** (`From`) všetkých e-mailov zákazníkom aj adminovi | `EMAIL_FROM` → `FROM` v `lib/mailer.ts` |
| **Prijímateľ** notifikácií o nových objednávkach | `lib/email-admin.ts` |
| **Prijímateľ** správ z kontaktného formulára (s `Reply-To` na zákazníka) | `lib/email-contact.ts` |
| **Prijímateľ** testovacieho e-mailu z administrácie | `app/api/admin/test-email` |

Adresa príjemcu je na jednom mieste ako `ADMIN_INBOX` v `lib/mailer.ts`; prepíše
sa premennou `ADMIN_ORDER_EMAIL`, ak by mali interné maily chodiť inam.

## Čo musí byť povolené v Microsofte 365

Toto sú najčastejšie dôvody, prečo odosielanie nefunguje ani so správnym heslom:

1. **SMTP AUTH musí byť pre schránku zapnutý.** Microsoft ho má štandardne
   vypnutý. Prejav: `535 5.7.139 Authentication unsuccessful,
   SmtpClientAuthentication is disabled for this tenant`. Zapína sa v Microsoft
   365 admin centre pri schránke, alebo cez PowerShell.
2. **Send as oprávnenie** pre `office@` na adresu `info@`. Bez neho server
   odmietne správu s `550 5.7.60 Client does not have permissions to send as
   this sender`.
3. **Viacfaktorové overenie / security defaults.** Ak sú zapnuté, obyčajné heslo
   cez SMTP neprejde a treba app password alebo výnimku pre túto schránku.

## Doručiteľnosť

SPF záznam domény `4frommedia.sk` musí povoľovať Microsoft
(`include:spf.protection.outlook.com`), ideálne spolu s DKIM zapnutým v Microsoft
365. Bez toho môžu maily končiť v spame.

## Diagnostika

- `GET /api/admin/test-email` (prihlásený ako admin) vráti účinnú konfiguráciu —
  host, port, secure, user, from, inbox. **Heslo nikdy nevracia.** Slúži na
  overenie, či sa premenné do deploymentu vôbec dostali v očakávanom tvare.
- Administrácia → Objednávky → **Test emailu** pošle skutočný mail a v odpovedi
  uvedie `transport`:
  - `"primary"` — odišlo cez Microsoft 365, všetko je v poriadku
  - `"fallback"` — primárny server zlyhal a mail zachránil záložný Gmail;
    dôvod je vypísaný v runtime logoch Vercelu

## Záložný Gmail

Kým sú v prostredí `GMAIL_USER` a `GMAIL_APP_PASSWORD`, slúžia ako záchranná
sieť: keď primárny server odmietne prihlásenie alebo obálku, `sendMail()` pošle
správu cez Gmail, aby kontaktný formulár nevracal zákazníkom 500. Odosielateľom
je vtedy gmailová adresa. Po overení, že Microsoft 365 funguje, sa dajú tieto
dve premenné z Vercelu odstrániť.
