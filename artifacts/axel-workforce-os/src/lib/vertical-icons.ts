import {
  Cannabis,
  HardHat,
  UsersRound,
  HeartPulse,
  UtensilsCrossed,
  Truck,
  Factory,
  ShoppingBag,
  Building2,
  type LucideIcon,
} from "lucide-react";

export const VERTICAL_ICONS: Record<string, LucideIcon> = {
  Cannabis,
  Construction: HardHat,
  Staffing: UsersRound,
  Healthcare: HeartPulse,
  Hospitality: UtensilsCrossed,
  Transportation: Truck,
  Manufacturing: Factory,
  Retail: ShoppingBag,
};

export function getVerticalIcon(vertical?: string | null): LucideIcon {
  if (!vertical) return Building2;
  return VERTICAL_ICONS[vertical] || Building2;
}
