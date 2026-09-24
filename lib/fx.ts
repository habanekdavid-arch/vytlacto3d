/**
 * Jeden prepínač pre hover efekty (vyletujúce tvary aj glitch).
 * Vypnutie: vo Verceli NEXT_PUBLIC_HOVER_FX=off a Redeploy.
 */
export const HOVER_FX_ENABLED = process.env.NEXT_PUBLIC_HOVER_FX !== "off";
