import type { Messages } from "./index";

const messages: Messages = {
  "Číslo objednávky": {
    en: "Order number",
    hu: "Rendelésszám",
    de: "Bestellnummer",
  },
  "Platba prebehla úspešne": {
    en: "Payment successful",
    hu: "Sikeres fizetés",
    de: "Zahlung erfolgreich",
  },
  "Ďakujeme za objednávku. Vaša platba bola úspešne prijatá a objednávka je zaevidovaná.": {
    en: "Thank you for your order. Your payment was received and the order has been registered.",
    hu: "Köszönjük a rendelését. A fizetését sikeresen fogadtuk, a rendelést rögzítettük.",
    de: "Vielen Dank für Ihre Bestellung. Ihre Zahlung ist eingegangen und die Bestellung wurde erfasst.",
  },
  "Potvrdenie objednávky a ďalšie informácie sme vám poslali e-mailom.": {
    en: "We have sent you the order confirmation and further information by email.",
    hu: "A rendelés visszaigazolását és további információkat e-mailben küldtük el.",
    de: "Die Bestellbestätigung und weitere Informationen haben wir Ihnen per E-Mail gesendet.",
  },
  "Platba sa spracováva": {
    en: "Payment is being processed",
    hu: "A fizetés feldolgozás alatt",
    de: "Zahlung wird verarbeitet",
  },
  "Platbu sme prijali od Stripe, ale potvrdenie ešte len spracovávame. Táto stránka sa automaticky obnoví, len čo bude objednávka potvrdená — zvyčajne to trvá pár sekúnd.": {
    en: "We have received the payment from Stripe but are still processing the confirmation. This page refreshes automatically as soon as the order is confirmed — usually within a few seconds.",
    hu: "A fizetést megkaptuk a Stripe-tól, de a visszaigazolást még feldolgozzuk. Ez az oldal automatikusan frissül, amint a rendelés megerősítésre kerül — ez általában néhány másodperc.",
    de: "Wir haben die Zahlung von Stripe erhalten, verarbeiten die Bestätigung aber noch. Diese Seite aktualisiert sich automatisch, sobald die Bestellung bestätigt ist — meist dauert das nur ein paar Sekunden.",
  },
  "Ak sa stav nezmení ani po chvíli, potvrdenie nájdete aj v histórii objednávok alebo vám príde e-mailom.": {
    en: "If the status does not change after a while, you will find the confirmation in your order history or receive it by email.",
    hu: "Ha az állapot egy idő után sem változik, a visszaigazolást a rendelési előzmények között találja, vagy e-mailben kapja meg.",
    de: "Ändert sich der Status auch nach einer Weile nicht, finden Sie die Bestätigung im Bestellverlauf oder erhalten sie per E-Mail.",
  },
  "Objednávku sa nepodarilo overiť": {
    en: "The order could not be verified",
    hu: "A rendelést nem sikerült ellenőrizni",
    de: "Die Bestellung konnte nicht überprüft werden",
  },
  "Túto objednávku sme nenašli alebo sa nedá overiť z tohto odkazu. Ak ste práve dokončili platbu, skontrolujte si e-mail alebo históriu objednávok — v prípade problému nás kontaktujte.": {
    en: "We could not find this order or it cannot be verified from this link. If you have just completed the payment, check your email or order history — contact us if there is a problem.",
    hu: "Ezt a rendelést nem találtuk, vagy ebből a linkből nem ellenőrizhető. Ha most fejezte be a fizetést, nézze meg az e-mailjeit vagy a rendelési előzményeket — probléma esetén lépjen kapcsolatba velünk.",
    de: "Diese Bestellung wurde nicht gefunden oder lässt sich über diesen Link nicht überprüfen. Wenn Sie die Zahlung gerade abgeschlossen haben, prüfen Sie Ihre E-Mails oder den Bestellverlauf — bei Problemen kontaktieren Sie uns.",
  },
  "Táto objednávka bola zrušená.": {
    en: "This order has been cancelled.",
    hu: "Ezt a rendelést törölték.",
    de: "Diese Bestellung wurde storniert.",
  },
  "Späť na hlavnú stránku": {
    en: "Back to the home page",
    hu: "Vissza a főoldalra",
    de: "Zurück zur Startseite",
  },
  "Vytvoriť ďalšiu objednávku": {
    en: "Create another order",
    hu: "Újabb rendelés",
    de: "Weitere Bestellung erstellen",
  },
  "ID rozpracovanej objednávky": {
    en: "Unfinished order ID",
    hu: "A félbehagyott rendelés azonosítója",
    de: "ID der offenen Bestellung",
  },
  "Platba bola zrušená": {
    en: "Payment cancelled",
    hu: "A fizetés megszakadt",
    de: "Zahlung abgebrochen",
  },
  "Objednávka nebola dokončená. Môžete sa vrátiť späť do konfigurátora, upraviť parametre a skúsiť platbu znova.": {
    en: "The order was not completed. You can go back to the configurator, adjust the parameters and try the payment again.",
    hu: "A rendelés nem fejeződött be. Visszatérhet a konfigurátorhoz, módosíthatja a paramétereket, és újra megpróbálhatja a fizetést.",
    de: "Die Bestellung wurde nicht abgeschlossen. Sie können zum Konfigurator zurückkehren, die Parameter anpassen und die Zahlung erneut versuchen.",
  },
  "Ak ste platbu prerušili omylom, stačí sa vrátiť späť a pokračovať v objednávke.": {
    en: "If you interrupted the payment by mistake, just go back and continue with your order.",
    hu: "Ha véletlenül szakította meg a fizetést, egyszerűen térjen vissza, és folytassa a rendelést.",
    de: "Wenn Sie die Zahlung versehentlich abgebrochen haben, kehren Sie einfach zurück und setzen Sie die Bestellung fort.",
  },
  "Späť do konfigurátora": {
    en: "Back to the configurator",
    hu: "Vissza a konfigurátorhoz",
    de: "Zurück zum Konfigurator",
  },
  "Prejsť na hlavnú stránku": {
    en: "Go to the home page",
    hu: "Tovább a főoldalra",
    de: "Zur Startseite",
  },
  "vrstva po vrstve": {
    en: "layer by layer",
    hu: "rétegről rétegre",
    de: "Schicht für Schicht",
  },
};

export default messages;
