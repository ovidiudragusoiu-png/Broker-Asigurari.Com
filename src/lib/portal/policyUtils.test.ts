import { describe, expect, it } from "vitest";
import {
  computeDashboardStats,
  getPolicyStatus,
  groupPoliciesByType,
} from "./policyUtils";

const samplePolicies = [
  {
    id: "1",
    productType: "TRAVEL",
    policyNumber: "T1",
    vendorName: "Allianz",
    premium: 100,
    currency: "RON",
    startDate: "2026-01-01",
    endDate: "2027-01-01",
    vehiclePlate: null,
    vehicleVin: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "2",
    productType: "RCA",
    policyNumber: "R1",
    vendorName: "Grawe",
    premium: 200,
    currency: "RON",
    startDate: "2026-01-01",
    endDate: "2026-06-10",
    vehiclePlate: "B 123 ABC",
    vehicleVin: null,
    createdAt: "2026-01-02T00:00:00.000Z",
  },
];

describe("policyUtils", () => {
  it("groups policies with RCA first", () => {
    const groups = groupPoliciesByType(samplePolicies);
    expect(groups.map((group) => group.productType)).toEqual(["RCA", "TRAVEL"]);
  });

  it("computes dashboard stats", () => {
    const stats = computeDashboardStats(samplePolicies);
    expect(stats.total).toBe(2);
    expect(stats.byType).toEqual([
      { productType: "RCA", label: "RCA", count: 1 },
      { productType: "TRAVEL", label: "Călătorie", count: 1 },
    ]);
  });

  it("marks near-term policies as expiring", () => {
    const status = getPolicyStatus("2026-06-10");
    expect(status.status).toBe("expiring");
  });
});
