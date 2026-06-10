export type PaymentDeclarationProduct =
  | "RCA"
  | "PAD"
  | "TRAVEL"
  | "HOUSE"
  | "MALPRAXIS"
  | "CASCO";

const POLICY_LABELS: Record<PaymentDeclarationProduct, string> = {
  RCA: "RCA",
  PAD: "PAD",
  TRAVEL: "de călătorie",
  HOUSE: "locuință",
  MALPRAXIS: "malpraxis",
  CASCO: "CASCO",
};

export function getPaymentDeclarationPolicyLabel(
  productType?: string
): string {
  if (!productType) return POLICY_LABELS.RCA;
  const key = productType.toUpperCase() as PaymentDeclarationProduct;
  return POLICY_LABELS[key] ?? productType;
}

export function getPaymentDeclarationText(productType?: string): string {
  const label = getPaymentDeclarationPolicyLabel(productType);
  return `Prin apăsarea butonului de plată, declar că am peste 18 ani și că datele furnizate pentru încheierea poliței ${label} sunt corecte și reale.`;
}
