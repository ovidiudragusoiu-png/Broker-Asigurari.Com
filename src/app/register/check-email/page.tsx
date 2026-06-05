import Link from "next/link";
import { MailCheck } from "lucide-react";
import ResendVerificationForm from "@/components/portal/ResendVerificationForm";
import { btn } from "@/lib/ui/tokens";
import { createPrivatePageMetadata } from "@/lib/seo/metadata";

export const metadata = createPrivatePageMetadata(
  "Confirmă emailul | Sigur.Ai",
  "/register/check-email",
  "Confirmă adresa de email pentru contul Sigur.Ai."
);

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; verify?: string }>;
}) {
  const params = await searchParams;
  const email = params.email?.trim() ?? "";
  const verify = params.verify;

  const initialMessage =
    verify === "expired"
      ? "Linkul de confirmare a expirat. Poți solicita unul nou mai jos."
      : undefined;

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
            <MailCheck className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Verifică emailul
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {email ? (
              <>
                Ți-am trimis un link de confirmare la{" "}
                <span className="font-medium text-gray-700">{email}</span>.
              </>
            ) : (
              "Ți-am trimis un link de confirmare. Deschide emailul și apasă pe butonul de confirmare."
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="mb-4 text-sm text-gray-600">
            După confirmare vei fi autentificat automat și vei putea accesa
            polițele tale. Linkul este valabil 24 de ore.
          </p>

          {email ? (
            <ResendVerificationForm
              email={email}
              initialMessage={initialMessage}
            />
          ) : (
            <p className="text-sm text-gray-500">
              Dacă nu găsești emailul, verifică folderul Spam sau încearcă din
              nou înregistrarea.
            </p>
          )}

          <p className="mt-6 text-center text-sm text-gray-500">
            Ai confirmat deja?{" "}
            <Link href="/login" className={btn.tertiary}>
              Autentifică-te
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
