// Realistic submission data matching the app's deal-sections shape.
export type Field = { label: string; value: string; required?: boolean; rating?: boolean };
export type Section = {
  key: string;
  label: string;
  icon: string; // lucide name resolved by each mockup
  status: "complete" | "partial" | "not_started";
  missing?: number;
  fields: Field[];
};

export const SECTIONS: Section[] = [
  {
    key: "business", label: "Business Info", icon: "Building2", status: "complete",
    fields: [
      { label: "Business name", value: "Hans and Franz Cannabis", required: true },
      { label: "Legal name", value: "H&F Cannabis Holdings LLC" },
      { label: "DBA", value: "Hans & Franz" },
      { label: "FEIN", value: "84-2231987", required: true },
      { label: "Entity type", value: "LLC", required: true },
      { label: "Years in business", value: "6" },
      { label: "Website", value: "hansandfranz.com" },
    ],
  },
  {
    key: "locations", label: "Locations", icon: "MapPin", status: "complete",
    fields: [
      { label: "Primary state", value: "CA", required: true, rating: true },
      { label: "States of operation", value: "CA, OR, NV", rating: true },
      { label: "# of locations", value: "4", required: true, rating: true },
      { label: "Multiple states", value: "Yes" },
    ],
  },
  {
    key: "workforce", label: "Workforce", icon: "Users", status: "complete",
    fields: [
      { label: "Full-time employees", value: "62", required: true, rating: true },
      { label: "Part-time employees", value: "18", rating: true },
      { label: "Annual payroll", value: "$4,830,000", required: true, rating: true },
      { label: "Experience mod (EMod)", value: "0.92", required: true, rating: true },
      { label: "Class codes", value: "0035, 8017, 8810", rating: true },
    ],
  },
  {
    key: "operations", label: "Operations", icon: "Factory", status: "complete",
    fields: [
      { label: "Description of operations", value: "Licensed cannabis cultivation, processing, and retail dispensary operations.", required: true },
      { label: "Industry vertical", value: "Cannabis", required: true },
      { label: "NAICS code", value: "111998" },
    ],
  },
  {
    key: "loss", label: "Loss History", icon: "History", status: "partial", missing: 1,
    fields: [
      { label: "Has prior coverage", value: "Yes", required: true },
      { label: "Non-renewed", value: "No" },
      { label: "Lapse in coverage", value: "No" },
      { label: "Loss runs uploaded", value: "—", required: true },
    ],
  },
  {
    key: "coverage", label: "Coverage", icon: "ShieldCheck", status: "complete",
    fields: [
      { label: "Product / program type", value: "WC + PEO", required: true },
      { label: "Effective date", value: "Sep 1, 2026", required: true },
    ],
  },
];

export const T = {
  bg: "#060608",
  panel: "#13131f",
  border: "rgba(255,255,255,0.09)",
  accent: "#E91E8C",
  accentSoft: "rgba(233,30,140,0.12)",
  text: "#ffffff",
  textSecondary: "rgba(255,255,255,0.78)",
  muted: "rgba(255,255,255,0.55)",
  green: "#22c55e",
  amber: "#FFB547",
};
