/** Farba z konfigurátora (id) → farba modelu v 3D náhľade. */
export function getColor(colorId: string) {
  switch (colorId) {
    case "white":
      return "#E5E7EB";
    case "gray":
      return "#9CA3AF";
    case "red":
      return "#DC2626";
    case "blue":
      return "#2563EB";
    case "green":
      return "#16A34A";
    case "yellow":
      return "#EAB308";
    case "orange":
      return "#F97316";
    case "purple":
      return "#9333EA";
    case "pink":
      return "#EC4899";
    case "transparent":
      return "#D1D5DB";
    case "black":
    default:
      return "#111111";
  }
}
