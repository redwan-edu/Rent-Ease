import { Building2, House, MapPin, TreePalm } from "lucide-react";

export type Kind = "villa" | "house" | "apartment" | "other";

export const KINDS: { value: Kind; label: string; Icon: typeof House }[] = [
  { value: "villa", label: "Villa", Icon: TreePalm },
  { value: "house", label: "House", Icon: House },
  { value: "apartment", label: "Apartment", Icon: Building2 },
  { value: "other", label: "Other", Icon: MapPin },
];

export function kindOf(kind: Kind) {
  return KINDS.find((k) => k.value === kind) ?? KINDS[3];
}
