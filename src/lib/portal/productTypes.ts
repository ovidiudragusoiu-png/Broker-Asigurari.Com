import {
  Car,
  Plane,
  Home,
  Shield,
  HeartPulse,
  ShieldCheck,
  FileText,
  type LucideIcon,
} from "lucide-react";

export const PRODUCT_TYPE_ORDER = [
  "RCA",
  "TRAVEL",
  "HOUSE",
  "PAD",
  "MALPRAXIS",
  "CASCO",
] as const;

export type ProductTypeCode = (typeof PRODUCT_TYPE_ORDER)[number] | string;

export interface ProductTypeConfig {
  label: string;
  icon: LucideIcon;
  badgeClass: string;
  iconClass: string;
  iconBgClass: string;
  accentClass: string;
  calculatorHref: string;
}

export const PRODUCT_TYPE_CONFIG: Record<string, ProductTypeConfig> = {
  RCA: {
    label: "RCA",
    icon: Car,
    badgeClass: "bg-blue-100 text-blue-700",
    iconClass: "text-blue-600",
    iconBgClass: "bg-blue-50",
    accentClass: "border-l-blue-500",
    calculatorHref: "/rca",
  },
  TRAVEL: {
    label: "Călătorie",
    icon: Plane,
    badgeClass: "bg-emerald-100 text-emerald-700",
    iconClass: "text-emerald-600",
    iconBgClass: "bg-emerald-50",
    accentClass: "border-l-emerald-500",
    calculatorHref: "/travel",
  },
  HOUSE: {
    label: "Locuință",
    icon: Home,
    badgeClass: "bg-amber-100 text-amber-700",
    iconClass: "text-amber-600",
    iconBgClass: "bg-amber-50",
    accentClass: "border-l-amber-500",
    calculatorHref: "/house",
  },
  PAD: {
    label: "PAD",
    icon: Shield,
    badgeClass: "bg-orange-100 text-orange-700",
    iconClass: "text-orange-600",
    iconBgClass: "bg-orange-50",
    accentClass: "border-l-orange-500",
    calculatorHref: "/pad",
  },
  MALPRAXIS: {
    label: "Malpraxis",
    icon: HeartPulse,
    badgeClass: "bg-rose-100 text-rose-700",
    iconClass: "text-rose-600",
    iconBgClass: "bg-rose-50",
    accentClass: "border-l-rose-500",
    calculatorHref: "/malpraxis",
  },
  CASCO: {
    label: "CASCO",
    icon: ShieldCheck,
    badgeClass: "bg-purple-100 text-purple-700",
    iconClass: "text-purple-600",
    iconBgClass: "bg-purple-50",
    accentClass: "border-l-purple-500",
    calculatorHref: "/casco",
  },
};

const FALLBACK_CONFIG: ProductTypeConfig = {
  label: "Asigurare",
  icon: FileText,
  badgeClass: "bg-gray-100 text-gray-700",
  iconClass: "text-gray-600",
  iconBgClass: "bg-gray-50",
  accentClass: "border-l-gray-400",
  calculatorHref: "/",
};

export function getProductTypeConfig(productType: string): ProductTypeConfig {
  return PRODUCT_TYPE_CONFIG[productType.toUpperCase()] ?? {
    ...FALLBACK_CONFIG,
    label: productType,
  };
}

export function sortProductTypes(types: string[]): string[] {
  const order = new Map<string, number>(
    PRODUCT_TYPE_ORDER.map((type, index) => [type, index])
  );
  return [...types].sort((a, b) => {
    const aIndex = order.get(a.toUpperCase()) ?? 999;
    const bIndex = order.get(b.toUpperCase()) ?? 999;
    if (aIndex !== bIndex) return aIndex - bIndex;
    return a.localeCompare(b);
  });
}
