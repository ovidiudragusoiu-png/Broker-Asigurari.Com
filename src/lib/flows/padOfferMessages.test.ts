import { describe, expect, it } from "vitest";
import { presentPadOfferError } from "./padOfferMessages";

describe("presentPadOfferError", () => {
  it("maps invalid postal code", () => {
    expect(
      presentPadOfferError(
        "INS-9999 | Eroare ofertare, mesaj asigurator PAID: Codul postal nu exista | "
      )
    ).toMatch(/poștal/i);
  });

  it("maps structure mismatch", () => {
    expect(
      presentPadOfferError(
        "INS-9999 | Eroare ofertare, mesaj asigurator PAID: Tipul structurii nu corespunde tipului de cladire. | "
      )
    ).toMatch(/structură/i);
  });

  it("maps generic product unavailable", () => {
    expect(presentPadOfferError("INS-9999 | Acest produs nu este disponibil")).toMatch(
      /tip pad/i
    );
  });
});
