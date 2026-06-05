import { randomBytes } from "crypto";

export const VERIFICATION_TOKEN_BYTES = 32;
export const VERIFICATION_EXPIRY_HOURS = 24;

export function createVerificationToken(): string {
  return randomBytes(VERIFICATION_TOKEN_BYTES).toString("hex");
}

export function getVerificationExpiry(): Date {
  return new Date(Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000);
}

export function isVerificationExpired(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) return true;
  return expiresAt.getTime() < Date.now();
}
