/** Typy dopytu v kontaktnom formulári — spoločné pre formulár, API aj e-mail. */
export const INQUIRY_TYPES = ["mam-model", "hladat-model"] as const;
export type InquiryType = (typeof INQUIRY_TYPES)[number];

export const INQUIRY_LABELS: Record<InquiryType, string> = {
  "mam-model": "Mám 3D model",
  "hladat-model": "Nemám 3D model — dohľadať na internete",
};

/** Krátky štítok do predmetu e-mailu. */
export const INQUIRY_SUBJECT_TAG: Record<InquiryType, string> = {
  "mam-model": "Mám model",
  "hladat-model": "Dohľadať model",
};

export function parseInquiryType(value: unknown): InquiryType {
  return INQUIRY_TYPES.includes(value as InquiryType) ? (value as InquiryType) : "mam-model";
}
