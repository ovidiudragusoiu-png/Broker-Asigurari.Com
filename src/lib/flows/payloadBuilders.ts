import type { PersonRequest } from "@/types/insuretech";

type VendorProductType = "RCA" | "TRAVEL" | "HOUSE" | "PAD" | "MALPRAXIS";
type PolicyPartyType = "INSURED" | "CONTRACTOR" | "CLIENT";

function withPolicyPartyType(
  person: PersonRequest,
  policyPartyType: PolicyPartyType
) {
  return { ...person, policyPartyType };
}

export function buildOrderPayload(
  vendorProductType: VendorProductType,
  mainInsured: PersonRequest,
  contractor: PersonRequest,
  extra: Record<string, unknown> = {}
) {
  return {
    vendorProductType,
    mainInsuredDetails: withPolicyPartyType(mainInsured, "INSURED"),
    contractorDetails: withPolicyPartyType(contractor, "CONTRACTOR"),
    ...extra,
  };
}

export function buildMalpraxisOrderPayload(person: PersonRequest) {
  return {
    ...buildOrderPayload("MALPRAXIS", person, person),
    clientDetails: withPolicyPartyType(person, "CLIENT"),
  };
}
