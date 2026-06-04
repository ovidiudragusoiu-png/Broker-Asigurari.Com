import { createPrivatePageMetadata } from "@/lib/seo/metadata";

export const metadata = createPrivatePageMetadata(
  "Plată | Sigur.Ai",
  "/payment",
  "Procesare plată poliță Sigur.Ai."
);

export default function PaymentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
