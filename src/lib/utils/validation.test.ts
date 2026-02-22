import {
  validateCNP,
  validateCUI,
  validateEmail,
  validatePhoneRO,
  validateVIN,
} from "./validation";

describe("validation utils", () => {
  const buildValidCnp = (first12: string) => {
    const weights = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];
    const digits = first12.split("").map(Number);
    const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0);
    const check = sum % 11 === 10 ? 1 : sum % 11;
    return `${first12}${check}`;
  };

  const buildValidCui = (firstDigits: string) => {
    const weights = [7, 5, 3, 2, 1, 7, 5, 3, 2];
    const digits = firstDigits.split("").map(Number);
    while (digits.length < 9) digits.unshift(0);
    const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0);
    const check = (sum * 10) % 11 === 10 ? 0 : (sum * 10) % 11;
    return `${firstDigits}${check}`;
  };

  it("validates email addresses", () => {
    expect(validateEmail("john@example.com")).toBe(true);
    expect(validateEmail("john.example.com")).toBe(false);
  });

  it("validates Romanian phone numbers", () => {
    expect(validatePhoneRO("0722123456")).toBe(true);
    expect(validatePhoneRO("+40722123456")).toBe(true);
    expect(validatePhoneRO("0211234567")).toBe(false);
  });

  it("validates VIN format", () => {
    expect(validateVIN("WVWZZZ1JZXW000001")).toBe(true);
    expect(validateVIN("INVALIDVIN123")).toBe(false);
  });

  it("validates CNP checksum", () => {
    const validCnp = buildValidCnp("196052342001");
    expect(validateCNP(validCnp)).toBe(true);
    expect(validateCNP(`${validCnp.slice(0, -1)}9`)).toBe(false);
  });

  it("validates CUI checksum", () => {
    const validCui = buildValidCui("1854729");
    expect(validateCUI(`RO${validCui}`)).toBe(true);
    expect(validateCUI(`${validCui.slice(0, -1)}9`)).toBe(false);
  });
});
