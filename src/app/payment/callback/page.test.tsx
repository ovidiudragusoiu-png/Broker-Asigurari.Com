import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentCallbackContent } from "./page";
import { api } from "@/lib/api/client";
import { useSearchParams } from "next/navigation";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const postMock = vi.mocked(api.post);
const useSearchParamsMock = vi.mocked(useSearchParams);

function setSearchParams(query: string) {
  const params = new URLSearchParams(query);
  useSearchParamsMock.mockReturnValue({
    get: (key: string) => params.get(key),
  } as ReturnType<typeof useSearchParams>);
}

describe("PaymentCallbackContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as typeof fetch;
  });

  it("blocks policy creation when payment verification throws", async () => {
    setSearchParams("status=APPROVED&offerId=10&orderHash=abc&productType=TRAVEL");
    postMock.mockRejectedValueOnce(new Error("verification unavailable"));

    render(<PaymentCallbackContent />);

    expect(
      await screen.findByText("Nu am putut confirma plata. Polita nu a fost emisa automat.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Nu am putut confirma plata" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Plata a fost procesata cu succes!" })
    ).not.toBeInTheDocument();

    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock).toHaveBeenCalledWith(
      "/online/offers/payment/check/v3?orderHash=abc",
      { offerIds: [10] },
      { Accept: "text/plain" }
    );
    expect(postMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/online/policies"),
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });

  it("requires every bundled HOUSE and PAD offer to be confirmed before policy creation", async () => {
    setSearchParams("status=APPROVED&offerId=10&orderHash=abc&productType=HOUSE");
    sessionStorage.setItem("housePolicyData", JSON.stringify({ padOfferId: 20 }));
    postMock
      .mockResolvedValueOnce(
        JSON.stringify([
          { offerId: 10, success: true, message: "Plata confirmata!" },
          { offerId: 20, success: true, message: "Plata confirmata!" },
        ])
      )
      .mockResolvedValueOnce({
        orderId: 100,
        offerId: 10,
        policyId: 30,
        series: "AB",
        number: "123",
        vendorName: "Asigurator",
        policyStartDate: "2026-06-09T00:00:00",
        policyEndDate: "2027-06-08T00:00:00",
      });

    render(<PaymentCallbackContent />);

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith(
        "/online/policies",
        { offerId: 10, paymentMethodType: "CardOnline", padOfferId: 20 },
        undefined,
        { timeoutMs: 120000 }
      );
    });

    expect(postMock).toHaveBeenNthCalledWith(
      1,
      "/online/offers/payment/check/v3?orderHash=abc",
      { offerIds: [10, 20] },
      { Accept: "text/plain" }
    );
    expect(await screen.findByText("Polita emisa cu succes")).toBeInTheDocument();
  });
});
