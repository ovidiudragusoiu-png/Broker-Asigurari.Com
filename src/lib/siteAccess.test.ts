import { describe, expect, it } from "vitest";
import {
  hasValidSiteAccessCookie,
  isSiteAccessPasswordValid,
  siteAccessCookieValue,
  secretsMatch,
} from "./siteAccess";

describe("siteAccess", () => {
  it("secretsMatch rejects wrong length and accepts equal values", () => {
    expect(secretsMatch("abc", "abcd")).toBe(false);
    expect(secretsMatch("test-password", "test-password")).toBe(true);
    expect(secretsMatch("test-password", "wrong-password")).toBe(false);
  });

  it("validates preview password and cookie", async () => {
    const password = "staging-password";
    expect(isSiteAccessPasswordValid(password, password)).toBe(true);
    expect(isSiteAccessPasswordValid(`  ${password}  `, password)).toBe(true);
    expect(isSiteAccessPasswordValid("wrong", password)).toBe(false);

    const cookie = await siteAccessCookieValue(password);
    expect(await hasValidSiteAccessCookie(cookie, password)).toBe(true);
    expect(await hasValidSiteAccessCookie(cookie, "other")).toBe(false);
    expect(await hasValidSiteAccessCookie(undefined, password)).toBe(false);
  });
});
