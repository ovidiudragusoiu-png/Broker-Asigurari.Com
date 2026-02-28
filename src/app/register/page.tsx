import { UserPlus } from "lucide-react";
import RegisterForm from "@/components/portal/RegisterForm";

export const metadata = {
  title: "Creează cont | Broker Asigurari",
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2563EB]/10">
            <UserPlus className="h-7 w-7 text-[#2563EB]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Creează cont</h1>
          <p className="mt-2 text-sm text-gray-500">
            Înregistrează-te pentru a-ți gestiona polițele de asigurare
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
