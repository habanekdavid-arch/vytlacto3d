import type { Messages } from "./index";

const messages: Messages = {
  "Kontaktujte nás": {
    en: "Contact us",
    hu: "Lépjen kapcsolatba velünk",
    de: "Kontaktieren Sie uns",
  },
  "Ak máte otázky ohľadom 3D tlače alebo objednávky, napíšte alebo zavolajte.": {
    en: "If you have questions about 3D printing or your order, write or call us.",
    hu: "Ha kérdése van a 3D nyomtatással vagy a rendeléssel kapcsolatban, írjon vagy hívjon minket.",
    de: "Wenn Sie Fragen zum 3D-Druck oder zu Ihrer Bestellung haben, schreiben oder rufen Sie uns an.",
  },
  "Sídlo: Nezábudková 5, 821 01 Bratislava": {
    en: "Registered office: Nezábudková 5, 821 01 Bratislava",
    hu: "Székhely: Nezábudková 5, 821 01 Pozsony",
    de: "Sitz: Nezábudková 5, 821 01 Bratislava",
  },
  "FAQ": {
    en: "FAQ",
    hu: "GYIK",
    de: "FAQ",
  },
  "Tu nájdeš odpovede na najčastejšie otázky o konfigurátore, objednávke, platbe, doprave a procese 3D tlače.": {
    en: "Here you'll find answers to the most common questions about the configurator, ordering, payment, shipping and the 3D printing process.",
    hu: "Itt találod a leggyakoribb kérdésekre adott válaszokat a konfigurátorról, a rendelésről, a fizetésről, a szállításról és a 3D nyomtatás folyamatáról.",
    de: "Hier findest du Antworten auf die häufigsten Fragen zu Konfigurator, Bestellung, Zahlung, Versand und dem 3D-Druckprozess.",
  },
  "Čo je VytlačTo3D?": {
    en: "What is VytlačTo3D?",
    hu: "Mi az a VytlačTo3D?",
    de: "Was ist VytlačTo3D?",
  },
  "VytlačTo3D je online konfigurátor 3D tlače, kde si zákazník nahrá STL model, nastaví materiál, kvalitu tlače, pevnosť, farbu a počet kusov. Systém následne automaticky vypočíta cenu objednávky.": {
    en: "VytlačTo3D is an online 3D printing configurator where you upload an STL model and set the material, print quality, strength, colour and quantity. The system then calculates the order price automatically.",
    hu: "A VytlačTo3D egy online 3D nyomtatási konfigurátor, ahol feltöltheti az STL modellt, és beállíthatja az anyagot, a nyomtatási minőséget, a szilárdságot, a színt és a darabszámot. A rendszer ezután automatikusan kiszámítja a rendelés árát.",
    de: "VytlačTo3D ist ein Online-Konfigurator für 3D-Druck: Sie laden ein STL-Modell hoch und stellen Material, Druckqualität, Festigkeit, Farbe und Stückzahl ein. Das System berechnet anschließend automatisch den Bestellpreis.",
  },
  "Momentálne podporujeme STL (.stl). Tento formát je najbežnejší pre 3D tlač a je vhodný pre väčšinu modelov určených na výrobu.": {
    en: "We currently support STL (.stl). This format is the most common for 3D printing and suits most models intended for production.",
    hu: "Jelenleg az STL (.stl) formátumot támogatjuk. Ez a 3D nyomtatás legelterjedtebb formátuma, és a legtöbb gyártásra szánt modellhez megfelelő.",
    de: "Derzeit unterstützen wir STL (.stl). Dieses Format ist im 3D-Druck am verbreitetsten und eignet sich für die meisten Modelle zur Fertigung.",
  },
  "Ako sa počíta cena?": {
    en: "How is the price calculated?",
    hu: "Hogyan számítják az árat?",
    de: "Wie wird der Preis berechnet?",
  },
  "Cena sa počíta podľa objemu modelu, typu materiálu, nastavenej kvality tlače, pevnosti výplne (infill), počtu kusov a odhadovaného času tlače. Výpočet prebieha automaticky priamo v konfigurátore.": {
    en: "The price is based on the model volume, material type, chosen print quality, infill strength, quantity and estimated print time. It is calculated automatically right in the configurator.",
    hu: "Az ár a modell térfogata, az anyag típusa, a beállított nyomtatási minőség, a kitöltés szilárdsága, a darabszám és a becsült nyomtatási idő alapján számítódik. A számítás automatikusan, közvetlenül a konfigurátorban történik.",
    de: "Der Preis richtet sich nach Modellvolumen, Materialart, gewählter Druckqualität, Füllungsfestigkeit, Stückzahl und geschätzter Druckzeit. Die Berechnung erfolgt automatisch direkt im Konfigurator.",
  },
  "Kedy zadávam adresu a dopravu?": {
    en: "When do I enter the address and shipping?",
    hu: "Mikor adom meg a címet és a szállítást?",
    de: "Wann gebe ich Adresse und Versand an?",
  },
  "Adresu doručenia a spôsob dopravy zákazník zadáva v Stripe checkoute pri platbe. Nemusí ich teda vypĺňať priamo v konfigurátore.": {
    en: "You enter the delivery address and shipping method in the Stripe checkout when paying, so you don't need to fill them in in the configurator.",
    hu: "A szállítási címet és a szállítási módot a Stripe fizetési oldalán adja meg, így a konfigurátorban nem kell kitöltenie őket.",
    de: "Lieferadresse und Versandart geben Sie beim Bezahlen im Stripe-Checkout an, im Konfigurator müssen Sie sie also nicht ausfüllen.",
  },
  "Môžem si pozrieť model pred objednávkou?": {
    en: "Can I view the model before ordering?",
    hu: "Megnézhetem a modellt rendelés előtt?",
    de: "Kann ich das Modell vor der Bestellung ansehen?",
  },
  "Áno. Po nahratí STL modelu sa zobrazí 3D náhľad, v ktorom si vie zákazník model otáčať, približovať a skontrolovať aj vizuálnu farbu podľa nastavenia v konfigurátore.": {
    en: "Yes. After uploading the STL model, a 3D preview appears where you can rotate and zoom the model and check the colour set in the configurator.",
    hu: "Igen. Az STL modell feltöltése után megjelenik egy 3D előnézet, ahol a modellt forgathatja, nagyíthatja, és ellenőrizheti a konfigurátorban beállított színt is.",
    de: "Ja. Nach dem Hochladen des STL-Modells erscheint eine 3D-Vorschau, in der Sie das Modell drehen, zoomen und die im Konfigurator gewählte Farbe prüfen können.",
  },
  "Je farba modelu vo vieweri záväzná?": {
    en: "Is the model colour in the viewer binding?",
    hu: "Kötelező érvényű a modell színe a nézegetőben?",
    de: "Ist die Modellfarbe im Viewer verbindlich?",
  },
  "Farba vo vieweri je vizuálna ukážka. Reálna dostupnosť farieb závisí od materiálu a skladu. Výber farby však slúži ako dôležitá informácia pre objednávku.": {
    en: "The colour in the viewer is a visual preview. Actual colour availability depends on the material and stock. Your colour choice is still important information for the order.",
    hu: "A nézegetőben látható szín csak vizuális minta. A színek tényleges elérhetősége az anyagtól és a készlettől függ. A színválasztás azonban fontos információ a rendeléshez.",
    de: "Die Farbe im Viewer ist eine visuelle Vorschau. Die tatsächliche Farbverfügbarkeit hängt von Material und Lager ab. Ihre Farbwahl ist dennoch eine wichtige Angabe für die Bestellung.",
  },
  "Ako prebieha stav objednávky po zaplatení?": {
    en: "What happens to the order status after payment?",
    hu: "Hogyan alakul a rendelés állapota fizetés után?",
    de: "Wie entwickelt sich der Bestellstatus nach der Zahlung?",
  },
  "Objednávka prechádza internými stavmi PENDING, PAID, PRINTING a DONE. Po úspešnej platbe Stripe webhook automaticky nastaví objednávku na PAID.": {
    en: "The order goes through the internal statuses PENDING, PAID, PRINTING and DONE. After a successful payment, a Stripe webhook automatically sets the order to PAID.",
    hu: "A rendelés a PENDING, PAID, PRINTING és DONE belső állapotokon megy keresztül. Sikeres fizetés után a Stripe webhook automatikusan PAID állapotra állítja a rendelést.",
    de: "Die Bestellung durchläuft die internen Status PENDING, PAID, PRINTING und DONE. Nach erfolgreicher Zahlung setzt ein Stripe-Webhook die Bestellung automatisch auf PAID.",
  },
  "Je možné objednávku upraviť po zaplatení?": {
    en: "Can I change the order after paying?",
    hu: "Módosítható a rendelés fizetés után?",
    de: "Kann ich die Bestellung nach der Zahlung ändern?",
  },
  "Ak sa tlač ešte nezačala, objednávku vieme individuálne upraviť po dohode. Po spustení výroby už zvyčajne nie je možné parametre meniť.": {
    en: "If printing has not started yet, we can adjust the order individually by agreement. Once production has started, the parameters usually can no longer be changed.",
    hu: "Ha a nyomtatás még nem kezdődött el, a rendelést egyeztetés után egyedileg módosíthatjuk. A gyártás megkezdése után a paraméterek általában már nem változtathatók.",
    de: "Wenn der Druck noch nicht begonnen hat, können wir die Bestellung nach Absprache individuell anpassen. Nach Produktionsbeginn lassen sich die Parameter in der Regel nicht mehr ändern.",
  },
  "Dostanem potvrdenie o zaplatení?": {
    en: "Will I receive a payment confirmation?",
    hu: "Kapok visszaigazolást a fizetésről?",
    de: "Erhalte ich eine Zahlungsbestätigung?",
  },
  "Áno. Po úspešnej platbe je možné zákazníkovi automaticky odoslať emailové potvrdenie s detailom objednávky.": {
    en: "Yes. After a successful payment, an email confirmation with the order details can be sent to you automatically.",
    hu: "Igen. Sikeres fizetés után automatikusan küldhető e-mailes visszaigazolás a rendelés részleteivel.",
    de: "Ja. Nach erfolgreicher Zahlung kann Ihnen automatisch eine E-Mail-Bestätigung mit den Bestelldetails gesendet werden.",
  },
  "Dĺžka výroby závisí od veľkosti modelu, materiálu, kvality a počtu kusov. Presný čas tlače sa premieta aj do výslednej ceny.": {
    en: "Production time depends on the model size, material, quality and quantity. The exact print time is also reflected in the final price.",
    hu: "A gyártás időtartama a modell méretétől, az anyagtól, a minőségtől és a darabszámtól függ. A pontos nyomtatási idő a végső árban is megjelenik.",
    de: "Die Fertigungsdauer hängt von Modellgröße, Material, Qualität und Stückzahl ab. Die genaue Druckzeit fließt auch in den Endpreis ein.",
  },
  "Blog o 3D tlači": {
    en: "3D printing blog",
    hu: "Blog a 3D nyomtatásról",
    de: "Blog über 3D-Druck",
  },
  "Články o 3D tlači, cenách 3D tlače, materiáloch, STL súboroch a možnostiach výroby na mieru.": {
    en: "Articles about 3D printing, 3D printing prices, materials, STL files and custom manufacturing options.",
    hu: "Cikkek a 3D nyomtatásról, a 3D nyomtatás áráról, az anyagokról, az STL fájlokról és az egyedi gyártás lehetőségeiről.",
    de: "Artikel über 3D-Druck, Preise für 3D-Druck, Materialien, STL-Dateien und Möglichkeiten der Fertigung nach Maß.",
  },
  "Žiadne články.": {
    en: "No articles.",
    hu: "Nincsenek cikkek.",
    de: "Keine Artikel.",
  },
  "Praktické články o 3D tlači, cenách, materiáloch, STL modeloch, prototypovaní a výrobe na mieru.": {
    en: "Practical articles about 3D printing, prices, materials, STL models, prototyping and custom manufacturing.",
    hu: "Gyakorlati cikkek a 3D nyomtatásról, az árakról, az anyagokról, az STL modellekről, a prototípusgyártásról és az egyedi gyártásról.",
    de: "Praktische Artikel über 3D-Druck, Preise, Materialien, STL-Modelle, Prototyping und Fertigung nach Maß.",
  },
  "Hlavný článok": {
    en: "Featured article",
    hu: "Kiemelt cikk",
    de: "Hauptartikel",
  },
  "Prečítať článok": {
    en: "Read article",
    hu: "Cikk elolvasása",
    de: "Artikel lesen",
  },
  "Ďalšie články": {
    en: "More articles",
    hu: "További cikkek",
    de: "Weitere Artikel",
  },
  "Čítať": {
    en: "Read",
    hu: "Olvasás",
    de: "Lesen",
  },
  "Článok nenájdený": {
    en: "Article not found",
    hu: "A cikk nem található",
    de: "Artikel nicht gefunden",
  },
  "Späť na blog": {
    en: "Back to the blog",
    hu: "Vissza a blogra",
    de: "Zurück zum Blog",
  },
  "Realizácie 3D tlače | VytlačTo3D": {
    en: "3D printing projects | VytlačTo3D",
    hu: "3D nyomtatási referenciák | VytlačTo3D",
    de: "3D-Druck-Referenzen | VytlačTo3D",
  },
  "Ukážky realizácií 3D tlače, prototypov, technických dielov, náhradných dielov a zákazkovej výroby na mieru.": {
    en: "Examples of 3D printing projects, prototypes, technical parts, spare parts and custom manufacturing.",
    hu: "Példák 3D nyomtatási munkákra, prototípusokra, műszaki alkatrészekre, pótalkatrészekre és egyedi gyártásra.",
    de: "Beispiele für 3D-Druck-Projekte, Prototypen, technische Teile, Ersatzteile und Fertigung nach Maß.",
  },
  "Ukážky 3D tlače a zákazkovej výroby": {
    en: "Examples of 3D printing and custom manufacturing",
    hu: "Példák 3D nyomtatásra és egyedi gyártásra",
    de: "Beispiele für 3D-Druck und Auftragsfertigung",
  },
  "Vybrané projekty, ktoré ukazujú možnosti 3D tlače v praxi — od prototypov, cez náhradné diely až po firemné zákazky a dizajnové objekty.": {
    en: "Selected projects that show what 3D printing can do in practice — from prototypes and spare parts to business orders and design objects.",
    hu: "Válogatott projektek, amelyek bemutatják a 3D nyomtatás gyakorlati lehetőségeit — a prototípusoktól a pótalkatrészeken át a céges megrendelésekig és dizájntárgyakig.",
    de: "Ausgewählte Projekte, die zeigen, was 3D-Druck in der Praxis kann — von Prototypen über Ersatzteile bis zu Firmenaufträgen und Designobjekten.",
  },
  "Realizácie pripravujeme.": {
    en: "Projects coming soon.",
    hu: "A referenciák hamarosan érkeznek.",
    de: "Referenzen folgen in Kürze.",
  },
  "Realizácia nenájdená": {
    en: "Project not found",
    hu: "A referencia nem található",
    de: "Referenz nicht gefunden",
  },
  "← Späť na realizácie": {
    en: "← Back to projects",
    hu: "← Vissza a referenciákhoz",
    de: "← Zurück zu den Referenzen",
  },
  "Rozmer": {
    en: "Size",
    hu: "Méret",
    de: "Größe",
  },
  "Realizácia": {
    en: "Year",
    hu: "Megvalósítás",
    de: "Umsetzung",
  },
  "Dodanie": {
    en: "Delivery",
    hu: "Szállítás",
    de: "Lieferung",
  },
  "Galéria": {
    en: "Gallery",
    hu: "Galéria",
    de: "Galerie",
  },
  "Ďalšie realizácie": {
    en: "More projects",
    hu: "További referenciák",
    de: "Weitere Referenzen",
  },
  "Pozrite si aj ďalšie projekty": {
    en: "See more projects",
    hu: "Nézze meg a további projekteket is",
    de: "Sehen Sie sich weitere Projekte an",
  },
  "Všetky realizácie": {
    en: "All projects",
    hu: "Összes referencia",
    de: "Alle Referenzen",
  },
  "Filtrovať realizácie podľa kategórie": {
    en: "Filter projects by category",
    hu: "Referenciák szűrése kategória szerint",
    de: "Referenzen nach Kategorie filtern",
  },
  "Zväčšiť fotku": {
    en: "Enlarge photo",
    hu: "Fotó nagyítása",
    de: "Foto vergrößern",
  },
  "Predchádzajúca fotka": {
    en: "Previous photo",
    hu: "Előző fotó",
    de: "Vorheriges Foto",
  },
  "Ďalšia fotka": {
    en: "Next photo",
    hu: "Következő fotó",
    de: "Nächstes Foto",
  },
  "Najviac {n} príloh.": {
    en: "At most {n} attachments.",
    hu: "Legfeljebb {n} melléklet.",
    de: "Höchstens {n} Anhänge.",
  },
  "tento formát nepodporujeme.": {
    en: "this format is not supported.",
    hu: "ezt a formátumot nem támogatjuk.",
    de: "dieses Format wird nicht unterstützt.",
  },
  "má viac ako {n} MB.": {
    en: "is larger than {n} MB.",
    hu: "nagyobb, mint {n} MB.",
    de: "ist größer als {n} MB.",
  },
  "súbor je prázdny.": {
    en: "the file is empty.",
    hu: "a fájl üres.",
    de: "die Datei ist leer.",
  },
  "Počkajte prosím, kým sa nahrajú všetky prílohy.": {
    en: "Please wait until all attachments are uploaded.",
    hu: "Kérjük, várjon, amíg minden melléklet feltöltődik.",
    de: "Bitte warten Sie, bis alle Anhänge hochgeladen sind.",
  },
  "Niektorú prílohu sa nepodarilo nahrať — odstráňte ju alebo ju pridajte znova.": {
    en: "An attachment could not be uploaded — remove it or add it again.",
    hu: "Egy mellékletet nem sikerült feltölteni — távolítsa el, vagy adja hozzá újra.",
    de: "Ein Anhang konnte nicht hochgeladen werden — entfernen Sie ihn oder fügen Sie ihn erneut hinzu.",
  },
  "Niečo sa pokazilo. Skúste to prosím znova.": {
    en: "Something went wrong. Please try again.",
    hu: "Valami hiba történt. Kérjük, próbálja újra.",
    de: "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.",
  },
  "Sieťová chyba. Skúste to prosím znova.": {
    en: "Network error. Please try again.",
    hu: "Hálózati hiba. Kérjük, próbálja újra.",
    de: "Netzwerkfehler. Bitte versuchen Sie es erneut.",
  },
  "Ďakujeme za správu!": {
    en: "Thank you for your message!",
    hu: "Köszönjük az üzenetét!",
    de: "Vielen Dank für Ihre Nachricht!",
  },
  "Ozveme sa vám čo najskôr na uvedený email.": {
    en: "We will get back to you as soon as possible at the email you provided.",
    hu: "A megadott e-mail-címen a lehető leghamarabb jelentkezünk.",
    de: "Wir melden uns so bald wie möglich unter der angegebenen E-Mail.",
  },
  "Napíšte nám": {
    en: "Write to us",
    hu: "Írjon nekünk",
    de: "Schreiben Sie uns",
  },
  "Nenašli ste odpoveď?": {
    en: "Didn't find an answer?",
    hu: "Nem találta a választ?",
    de: "Keine Antwort gefunden?",
  },
  "Napíšte nám priamo cez formulár nižšie, odpovieme vám čo najskôr.": {
    en: "Write to us using the form below and we will reply as soon as possible.",
    hu: "Írjon nekünk az alábbi űrlapon, és a lehető leghamarabb válaszolunk.",
    de: "Schreiben Sie uns über das Formular unten, wir antworten so schnell wie möglich.",
  },
  "Meno *": {
    en: "Name *",
    hu: "Név *",
    de: "Name *",
  },
  "Email *": {
    en: "Email *",
    hu: "E-mail *",
    de: "E-Mail *",
  },
  "Predmet *": {
    en: "Subject *",
    hu: "Tárgy *",
    de: "Betreff *",
  },
  "Správa *": {
    en: "Message *",
    hu: "Üzenet *",
    de: "Nachricht *",
  },
  "Prílohy": {
    en: "Attachments",
    hu: "Mellékletek",
    de: "Anhänge",
  },
  "(nepovinné)": {
    en: "(optional)",
    hu: "(nem kötelező)",
    de: "(optional)",
  },
  "Pridať prílohy": {
    en: "Add attachments",
    hu: "Mellékletek hozzáadása",
    de: "Anhänge hinzufügen",
  },
  "Presuňte súbory sem alebo": {
    en: "Drag files here or",
    hu: "Húzza ide a fájlokat, vagy",
    de: "Dateien hierher ziehen oder",
  },
  "Maximálny počet príloh": {
    en: "Maximum number of attachments",
    hu: "Mellékletek maximális száma",
    de: "Maximale Anzahl Anhänge",
  },
  "vyberte súbory": {
    en: "choose files",
    hu: "válasszon fájlokat",
    de: "Dateien auswählen",
  },
  "najviac {n} súborov, každý do {mb} MB": {
    en: "up to {n} files, each up to {mb} MB",
    hu: "legfeljebb {n} fájl, egyenként legfeljebb {mb} MB",
    de: "höchstens {n} Dateien, je bis {mb} MB",
  },
  "3D modely (STL, OBJ, 3MF, STEP…), obrázky, PDF, Word, Excel, DXF/DWG, ZIP": {
    en: "3D models (STL, OBJ, 3MF, STEP…), images, PDF, Word, Excel, DXF/DWG, ZIP",
    hu: "3D modellek (STL, OBJ, 3MF, STEP…), képek, PDF, Word, Excel, DXF/DWG, ZIP",
    de: "3D-Modelle (STL, OBJ, 3MF, STEP…), Bilder, PDF, Word, Excel, DXF/DWG, ZIP",
  },
  "Nahrávam prílohy...": {
    en: "Uploading attachments...",
    hu: "Mellékletek feltöltése...",
    de: "Anhänge werden hochgeladen...",
  },
  "Odosielam...": {
    en: "Sending...",
    hu: "Küldés...",
    de: "Wird gesendet...",
  },
  "Odoslať správu": {
    en: "Send message",
    hu: "Üzenet küldése",
    de: "Nachricht senden",
  },
  "Predmet": {
    en: "Subject",
    hu: "Tárgy",
    de: "Betreff",
  },
};

export default messages;
