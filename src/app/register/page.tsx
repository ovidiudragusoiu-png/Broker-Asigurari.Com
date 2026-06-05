import { UserPlus } from "lucide-react";
import RegisterForm from "@/components/portal/RegisterForm";
import { createPrivatePageMetadata } from "@/lib/seo/metadata";

export const metadata = createPrivatePageMetadata(
  "Creează cont | Sigur.Ai",
  "/register",
  "Înregistrare cont Sigur.Ai."
);

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 pb-12 pt-24 sm:pt-28">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2563EB]/10">
            <UserPlus className="h-7 w-7 text-[#2563EB]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Creează cont</h1>
          <p className="mt-2 text-sm text-gray-500">
            Înregistrează-te pentru a-ți gestiona polițele online. Vei primi un
            email de confirmare înainte de prima autentificare.
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
