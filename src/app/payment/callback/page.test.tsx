import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PaymentCallbackPage from "./page";

const { getSearchParams, postMock, setSearchParams } = vi.hoisted(() => {
  let params = new URLSearchParams();
  return {
    getSearchParams: () => params,
    postMock: vi.fn(),
    setSearchParams: (query: string) => {
      params = new URLSearchParams(query);
    },
  };
});

vi.mock("next/navigation", () => ({
  useSearchParams: getSearchParams,
}));

vi.mock("@/lib/api/client", () => ({
  api: {
    post: (...args: unknown[]) => postMock(...args),
  },
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("PaymentCallbackPage", () => {
  beforeEach(() => {
    postMock.mockReset();
    setSearchParams(
      "status=APPROVED&offerId=42&orderHash=order-hash&productType=TRAVEL"
    );
  });

  it("does not create a policy when payment verification fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    postMock.mockRejectedValueOnce(new Error("Request timed out"));

    render(<PaymentCallbackPage />);

    expect(
      await screen.findByText("Nu am putut confirma plata: Request timed out")
    ).toBeInTheDocument();

    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
    expect(String(postMock.mock.calls[0][0])).toContain(
      "/online/offers/payment/check/v3"
    );
    expect(
      postMock.mock.calls.some(([url]) => String(url).includes("/online/policies"))
    ).toBe(false);

    warnSpy.mockRestore();
  });
});
