import { describe, expect, it } from "vitest";
import {
  getHouseMissingIds,
  getHouseOfferBlockers,
  getMalpraxisMissingIds,
  getMalpraxisOfferBlockers,
  getPadMissingIds,
  getPadOfferBlockers,
  getTravelMissingIds,
  getTravelOfferBlockers,
} from "@/lib/flows/agreementFormUtils";
import { HOUSE_AGREEMENTS_INITIAL } from "@/lib/flows/houseAgreementsCopy";
import { MALPRAXIS_AGREEMENTS_INITIAL } from "@/lib/flows/malpraxisAgreementsCopy";
import { PAD_AGREEMENTS_INITIAL } from "@/lib/flows/padAgreementsCopy";
import { TRAVEL_AGREEMENTS_INITIAL } from "@/lib/flows/travelAgreementsCopy";

describe("agreementFormUtils", () => {
  it("PAD initial state only pre-checks email channel", () => {
    expect(PAD_AGREEMENTS_INITIAL.comm_1_1).toBe(true);
    expect(getPadMissingIds(PAD_AGREEMENTS_INITIAL)).toEqual([
      "dnt_0_1",
      "dnt_0_2",
      "dnt_0_4",
      "dnt_0_5",
      "dnt_0_6",
      "broker_1_1",
      "broker_1_2",
      "broker_1_3",
    ]);
  });

  it("House initial state only pre-checks email channel", () => {
    expect(HOUSE_AGREEMENTS_INITIAL.comm_1_1).toBe(true);
    expect(getHouseMissingIds(HOUSE_AGREEMENTS_INITIAL).length).toBeGreaterThan(0);
    expect(getHouseMissingIds(HOUSE_AGREEMENTS_INITIAL)).not.toContain("comm_1_1");
  });

  it("Travel initial state has no pre-selected DNT checkbox groups", () => {
    expect(TRAVEL_AGREEMENTS_INITIAL.comm_1_1).toBe(true);
    expect(TRAVEL_AGREEMENTS_INITIAL.dnt_0_7_baggage).toBe(false);
    expect(TRAVEL_AGREEMENTS_INITIAL.dnt_0_7_sports).toBe(false);
    expect(TRAVEL_AGREEMENTS_INITIAL.dnt_0_7_none).toBe(false);
    expect(TRAVEL_AGREEMENTS_INITIAL.dnt_0_8_plane).toBe(false);
    expect(getTravelMissingIds(TRAVEL_AGREEMENTS_INITIAL)).not.toContain("comm_1_1");
  });

  it("Malpraxis initial state only pre-checks email channel", () => {
    expect(MALPRAXIS_AGREEMENTS_INITIAL.comm_1_1).toBe(true);
    expect(getMalpraxisMissingIds(MALPRAXIS_AGREEMENTS_INITIAL)).toEqual([
      "general_stats",
      "broker_gdpr",
      "dnt_marketing",
      "dnt_minors",
      "dnt_offer",
    ]);
  });

  it("blocks offers when DNT 0.1 or brokeraj 1.1 is NU (house/pad/travel)", () => {
    const base = { ...HOUSE_AGREEMENTS_INITIAL, dnt_0_1: "DA" as const, broker_1_1: "da" as const };
    expect(getHouseOfferBlockers(base)).toEqual([]);
    expect(getHouseOfferBlockers({ ...base, dnt_0_1: "NU" })).toEqual(["dnt_0_1"]);
    expect(getHouseOfferBlockers({ ...base, broker_1_1: "nu" })).toEqual(["broker_1_1"]);
    expect(
      getHouseOfferBlockers({ ...base, dnt_0_1: "NU", broker_1_1: "nu" })
    ).toEqual(["dnt_0_1", "broker_1_1"]);

    const padBase = { ...PAD_AGREEMENTS_INITIAL, dnt_0_1: "DA" as const, broker_1_1: "da" as const };
    expect(getPadOfferBlockers({ ...padBase, dnt_0_1: "NU" })).toEqual(["dnt_0_1"]);

    const travelBase = {
      ...TRAVEL_AGREEMENTS_INITIAL,
      dnt_0_1: "DA" as const,
      broker_1_1: "da" as const,
    };
    expect(getTravelOfferBlockers({ ...travelBase, broker_1_1: "nu" })).toEqual(["broker_1_1"]);
  });

  it("blocks malpraxis offers when brokerage GDPR consent is nu", () => {
    expect(
      getMalpraxisOfferBlockers({ ...MALPRAXIS_AGREEMENTS_INITIAL, broker_gdpr: "da" })
    ).toEqual([]);
    expect(
      getMalpraxisOfferBlockers({ ...MALPRAXIS_AGREEMENTS_INITIAL, broker_gdpr: "nu" })
    ).toEqual(["broker_gdpr"]);
  });
});
