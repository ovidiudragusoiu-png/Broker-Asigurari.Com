import { getPaymentDeclarationText } from "@/lib/ui/paymentDeclaration";

interface PaymentDeclarationBannerProps {
  productType?: string;
  className?: string;
}

export default function PaymentDeclarationBanner({
  productType,
  className = "",
}: PaymentDeclarationBannerProps) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl bg-blue-50/60 p-4 ${className}`.trim()}
    >
      <svg
        className="mt-0.5 h-5 w-5 shrink-0 text-blue-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
        />
      </svg>
      <p className="text-sm text-gray-600">{getPaymentDeclarationText(productType)}</p>
    </div>
  );
}
