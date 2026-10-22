/**
 * Mobilné prehliadače (Android, iPhone, iPad) nepoznajú typy 3D súborov
 * (STL, OBJ, 3MF, STEP…). Keď má výber súboru `accept` s ich príponami,
 * tieto súbory v priečinkoch zosivejú a nedajú sa vybrať. Na mobile preto
 * obmedzenie zrušíme — príponu kontroluje formulár až po výbere.
 */
export function isMobileFilePicker(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
  // iPadOS sa hlási ako Mac, prezradí ho dotyková obrazovka.
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 0;
}

export function relaxAcceptOnMobile(input: HTMLInputElement | null) {
  if (input && isMobileFilePicker()) input.removeAttribute("accept");
}
