import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useConsentWizardPersistence } from "./useConsentWizardPersistence";

describe("useConsentWizardPersistence", () => {
  it("skips consent after completion for the same person key", () => {
    const { result } = renderHook(() =>
      useConsentWizardPersistence({ q1: "" })
    );

    act(() => {
      result.current.syncPersonKey("123");
      result.current.markConsentCompleted("123");
    });

    expect(result.current.shouldSkipConsentFlow("123")).toBe(true);
    expect(result.current.shouldSkipConsentFlow("456")).toBe(false);
  });

  it("resets when person key changes", () => {
    const { result } = renderHook(() =>
      useConsentWizardPersistence({ q1: "" })
    );

    act(() => {
      result.current.markConsentCompleted("123");
      result.current.syncPersonKey("456");
    });

    expect(result.current.shouldSkipConsentFlow("123")).toBe(false);
    expect(result.current.consentCompleted).toBe(false);
  });
});
