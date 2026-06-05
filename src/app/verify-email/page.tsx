import { redirect } from "next/navigation";
import { verifyEmailAccount } from "@/lib/auth/verifyEmailAccount";
import { signToken, setAuthCookie } from "@/lib/auth/jwt";
import { createPrivatePageMetadata } from "@/lib/seo/metadata";

export const metadata = createPrivatePageMetadata(
  "Confirmă emailul | Sigur.Ai",
  "/verify-email",
  "Confirmă adresa de email pentru contul Sigur.Ai."
);

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;

  try {
    const result = await verifyEmailAccount(params.token);

    if (result.userId && result.email) {
      const jwt = await signToken(result.userId, result.email);
      await setAuthCookie(jwt);
    }

    redirect(result.redirectTo);
  } catch (error) {
    console.error("Verify email page error:", error);
    redirect("/login?verify=error");
  }
}
