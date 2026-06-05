import { getProductTypeConfig, sortProductTypes } from "./productTypes";

export interface DashboardPolicy {
  id: string;
  productType: string;
  policyNumber: string | null;
  vendorName: string | null;
  premium: number | null;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  vehiclePlate: string | null;
  vehicleVin: string | null;
  createdAt: string;
}

export type PolicyStatus = "active" | "expiring" | "expired" | "unknown";

export interface PolicyStatusInfo {
  status: PolicyStatus;
  label: string;
  className: string;
}

const EXPIRING_SOON_DAYS = 30;

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getPolicyStatus(endDate: string | null): PolicyStatusInfo {
  const end = parseDate(endDate);
  if (!end) {
    return {
      status: "unknown",
      label: "Activă",
      className: "bg-gray-100 text-gray-600",
    };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  if (endDay < today) {
    return {
      status: "expired",
      label: "Expirată",
      className: "bg-red-50 text-red-700",
    };
  }

  const daysLeft = Math.ceil(
    (endDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysLeft <= EXPIRING_SOON_DAYS) {
    return {
      status: "expiring",
      label: `Expiră în ${daysLeft} ${daysLeft === 1 ? "zi" : "zile"}`,
      className: "bg-amber-50 text-amber-700",
    };
  }

  return {
    status: "active",
    label: "Activă",
    className: "bg-emerald-50 text-emerald-700",
  };
}

export interface DashboardStats {
  total: number;
  active: number;
  expiring: number;
  expired: number;
  byType: { productType: string; label: string; count: number }[];
}

export function computeDashboardStats(
  policies: DashboardPolicy[]
): DashboardStats {
  const typeCounts = new Map<string, number>();

  let active = 0;
  let expiring = 0;
  let expired = 0;

  for (const policy of policies) {
    const status = getPolicyStatus(policy.endDate).status;
    if (status === "active" || status === "unknown") active++;
    if (status === "expiring") expiring++;
    if (status === "expired") expired++;

    const key = policy.productType.toUpperCase();
    typeCounts.set(key, (typeCounts.get(key) ?? 0) + 1);
  }

  const byType = sortProductTypes([...typeCounts.keys()]).map((productType) => ({
    productType,
    label: getProductTypeConfig(productType).label,
    count: typeCounts.get(productType) ?? 0,
  }));

  return {
    total: policies.length,
    active,
    expiring,
    expired,
    byType,
  };
}

export function groupPoliciesByType(
  policies: DashboardPolicy[]
): { productType: string; label: string; policies: DashboardPolicy[] }[] {
  const groups = new Map<string, DashboardPolicy[]>();

  for (const policy of policies) {
    const key = policy.productType.toUpperCase();
    const list = groups.get(key) ?? [];
    list.push(policy);
    groups.set(key, list);
  }

  return sortProductTypes([...groups.keys()]).map((productType) => ({
    productType,
    label: getProductTypeConfig(productType).label,
    policies: sortPolicies(groups.get(productType) ?? []),
  }));
}

export function sortPolicies(policies: DashboardPolicy[]): DashboardPolicy[] {
  return [...policies].sort((a, b) => {
    const aEnd = parseDate(a.endDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bEnd = parseDate(b.endDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (aEnd !== bEnd) return aEnd - bEnd;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function toDashboardPolicy(policy: {
  id: string;
  productType: string;
  policyNumber: string | null;
  vendorName: string | null;
  premium: number | null;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  vehiclePlate?: string | null;
  vehicleVin?: string | null;
  createdAt: Date | string;
}): DashboardPolicy {
  return {
    id: policy.id,
    productType: policy.productType,
    policyNumber: policy.policyNumber,
    vendorName: policy.vendorName,
    premium: policy.premium,
    currency: policy.currency,
    startDate: policy.startDate,
    endDate: policy.endDate,
    vehiclePlate: policy.vehiclePlate ?? null,
    vehicleVin: policy.vehicleVin ?? null,
    createdAt:
      typeof policy.createdAt === "string"
        ? policy.createdAt
        : policy.createdAt.toISOString(),
  };
}
