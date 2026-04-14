interface TerritoryEntry {
  zipStart: number;
  zipEnd: number;
  territory: number;
  multiplier: number;
}

const CA_TERRITORIES: TerritoryEntry[] = [
  { zipStart: 900, zipEnd: 918, territory: 1,  multiplier: 1.25 },
  { zipStart: 919, zipEnd: 922, territory: 2,  multiplier: 0.90 },
  { zipStart: 923, zipEnd: 924, territory: 3,  multiplier: 1.05 },
  { zipStart: 925, zipEnd: 926, territory: 4,  multiplier: 1.00 },
  { zipStart: 927, zipEnd: 931, territory: 5,  multiplier: 1.20 },
  { zipStart: 932, zipEnd: 938, territory: 6,  multiplier: 1.10 },
  { zipStart: 939, zipEnd: 951, territory: 7,  multiplier: 0.90 },
  { zipStart: 952, zipEnd: 953, territory: 8,  multiplier: 1.00 },
  { zipStart: 954, zipEnd: 954, territory: 9,  multiplier: 0.90 },
  { zipStart: 955, zipEnd: 955, territory: 10, multiplier: 1.00 },
  { zipStart: 956, zipEnd: 958, territory: 11, multiplier: 0.95 },
  { zipStart: 959, zipEnd: 961, territory: 12, multiplier: 1.00 },
];

export function getCATerritoryMultiplier(state: string, zip: string): {
  multiplier: number;
  territory: number | null;
} {
  if (state?.toUpperCase() !== "CA") {
    return { multiplier: 1.0, territory: null };
  }

  const zip3 = parseInt(String(zip || "").replace(/\D/g, "").substring(0, 3), 10);

  if (isNaN(zip3)) {
    return { multiplier: 1.0, territory: null };
  }

  const entry = CA_TERRITORIES.find((t) => zip3 >= t.zipStart && zip3 <= t.zipEnd);

  if (!entry) {
    return { multiplier: 1.0, territory: null };
  }

  return { multiplier: entry.multiplier, territory: entry.territory };
}
