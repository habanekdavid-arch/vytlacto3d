export function getSellerInfo() {
  return {
    name:    process.env.SELLER_NAME    ?? "VytlacTo3D",
    street:  process.env.SELLER_STREET  ?? "Vaša ulica 1",
    city:    process.env.SELLER_CITY    ?? "Bratislava",
    zip:     process.env.SELLER_ZIP     ?? "811 01",
    country: process.env.SELLER_COUNTRY ?? "Slovensko",
    ico:     process.env.SELLER_ICO     ?? "",
    dic:     process.env.SELLER_DIC     ?? "",
    icDph:   process.env.SELLER_IC_DPH  ?? "",
    iban:    process.env.SELLER_IBAN    ?? "",
    bank:    process.env.SELLER_BANK    ?? "",
    email:   process.env.SELLER_EMAIL   ?? "info@vytlacto3d.sk",
    phone:   process.env.SELLER_PHONE   ?? "",
  };
}
