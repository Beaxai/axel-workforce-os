/**
 * Phase 4C — maps the tabler icon keys used by the section model (server) to
 * the lucide-react icons used across the Axel app.
 */
import {
  Building2,
  MapPin,
  Users,
  Settings,
  History,
  FileText,
  type LucideIcon,
} from "lucide-react";

const SECTION_ICONS: Record<string, LucideIcon> = {
  "ti-building": Building2,
  "ti-map-pin": MapPin,
  "ti-users": Users,
  "ti-settings": Settings,
  "ti-history": History,
  "ti-file-description": FileText,
};

export function sectionIcon(key: string): LucideIcon {
  return SECTION_ICONS[key] ?? FileText;
}

/** Semantic status colors — readable on both light and dark surfaces. */
export const STATUS_COLORS = {
  complete: "#4caf50",
  partial: "#c79a3a",
  not_started: "#9aa0a6",
} as const;
