import { getCurrentUser } from "./session";
import type { AuthUser } from "@/types/auth";

const DEFAULT_ADMIN_EMAILS = [
  "office@sigur.ai",
  "ovidiu.dragusoiu@gmail.com",
];

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS?.trim();
  if (!raw) return DEFAULT_ADMIN_EMAILS;
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(email.toLowerCase().trim());
}

export async function getAdminUser(): Promise<AuthUser | null> {
  const user = await getCurrentUser();
  if (!user || !isAdminEmail(user.email)) return null;
  return user;
}
