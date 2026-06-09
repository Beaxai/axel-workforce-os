export const PRODUCT_TYPES = {
  WC_ONLY: "WC_ONLY",
  PEO: "PEO",
  ASO: "ASO",
} as const;

export type ProductType = typeof PRODUCT_TYPES[keyof typeof PRODUCT_TYPES];

export const ASO_BASE_PEPM_RATE = 50.0;

export const PRODUCT_LABELS: Record<string, string> = {
  WC: "WC",
  WC_ONLY: "WC",
  PEO: "PEO",
  ASO: "ASO",
};

export const PRODUCT_COLORS: Record<string, string> = {
  WC: "#1E6BE9",
  WC_ONLY: "#1E6BE9",
  PEO: "#6D28D9",
  ASO: "#6D28D9",
};

export function isAsoProduct(productType?: string | null): boolean {
  return productType === PRODUCT_TYPES.ASO;
}

export function isPeoProduct(productType?: string | null): boolean {
  return productType === PRODUCT_TYPES.PEO;
}
