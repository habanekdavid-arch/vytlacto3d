# E-mailová konfigurácia (SMTP)

Web odosiela všetky e-maily — potvrdenia objednávok, podklady na platbu prevodom,
upomienky, kontaktný formulár, uvítacie maily aj notifikácie adminovi — cez SMTP
schránku **info@4frommedia.sk**, ktorá je hostovaná u WebSupportu.

## Env premenné

Nastavujú sa vo Vercel → Project → Settings → Environment Variables (a lokálne
v `.env.local`):

| Premenná        | Hodnota / default                 | Popis |
| --------------- | --------------------------------- | ----- |
| `SMTP_HOST`     | `smtp.m1.websupport.sk` (default) | Odosielací server. Presný názov je uvedený vo WebSupport administrácii pri danej schránke — ak sa líši, prepíš ho tu. |
| `SMTP_PORT`     | `465` (default)                   | `465` = SSL/TLS, `587` = STARTTLS. |
| `SMTP_SECURE`   | *(nepovinné)*                     | `true` / `false`. Bez nej sa odvodí z portu (465 → `true`). |
| `SMTP_USER`     | `info@4frommedia.sk`              | Celá e-mailová adresa slúži ako prihlasovacie meno. |
| `SMTP_PASSWORD` | *(heslo k schránke)*              | Heslo z WebSupport administrácie. |
| `EMAIL_FROM`    | *(nepovinné)*                     | Napr. `VytlačTo3D <info@4frommedia.sk>`. Bez nej sa poskladá z `SMTP_USER`. |

Súvisiace premenné:

- `ADMIN_ORDER_EMAIL` — interná schránka, do ktorej chodia notifikácie o nových
  objednávkach a správy z kontaktného formulára (default `info@4frommedia.sk`)
- `ADMIN_EMAILS` — čiarkou oddelený zoznam adries s prístupom do administrácie
- `SELLER_EMAIL` — kontaktná adresa na faktúrach (default `info@4frommedia.sk`)

## Odosielateľ aj prijímateľ

`info@4frommedia.sk` je zároveň odosielacia aj prijímacia adresa:

| Smer | Kde sa to deje |
| ---- | -------------- |
| **Odosielateľ** (`From`) všetkých e-mailov zákazníkom aj adminovi | `FROM` v `lib/mailer.ts` |
| **Prijímateľ** notifikácií o nových objednávkach | `lib/email-admin.ts` |
| **Prijímateľ** správ z kontaktného formulára (s `Reply-To` na zákazníka) | `lib/email-contact.ts` |
| **Prijímateľ** testovacieho e-mailu z administrácie | `app/api/admin/test-email` |
| Cieľ odpovedí zákazníkov — odpoveď na ktorýkoľvek mail z webu | vyplýva z `From` |

Adresa je na jednom mieste ako `ADMIN_INBOX` v `lib/mailer.ts`; prepíše sa
premennou `ADMIN_ORDER_EMAIL`, ak by mali interné maily chodiť inam.

## Postup pri prepnutí

1. Vo WebSupport administrácii over/vytvor schránku `info@4frommedia.sk` a jej heslo.
2. Vo Verceli pridaj `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`
   (Production + Preview + Development).
3. Redeploy — env premenné sa načítavajú pri builde/štarte funkcie.
4. V administrácii → Objednávky klikni na **Test emailu**. Testovací mail sa odošle
   z `info@4frommedia.sk` do `info@4frommedia.sk` — jedným klikom sa tak overí
   odosielanie aj doručovanie. V tele mailu je vidieť použitú odosielaciu adresu.
5. Keď test prejde, zmaž z Vercelu staré `GMAIL_USER` a `GMAIL_APP_PASSWORD`.

## Doručiteľnosť

Doména `4frommedia.sk` musí mať v DNS SPF záznam povoľujúci WebSupport
(napr. `v=spf1 include:_spf.websupport.sk ~all`), ideálne aj DKIM zapnutý vo
WebSupport administrácii. Bez toho môžu maily končiť v spame.

## Fallback na Gmail

Kým nie sú `SMTP_*` premenné nastavené, `lib/mailer.ts` použije staré
`GMAIL_USER` / `GMAIL_APP_PASSWORD` cez `smtp.gmail.com`. Deploy teda neprestane
odosielať e-maily hneď po nasadení tejto zmeny, ale až po nastavení nových
premenných sa reálne prepne na WebSupport.
