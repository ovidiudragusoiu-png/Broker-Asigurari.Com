import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdminEmail } from "@/lib/auth/admin";
import AdminNav from "@/components/admin/AdminNav";
import LogoutButton from "@/components/portal/LogoutButton";
import { createPrivatePageMetadata } from "@/lib/seo/metadata";
import { Shield } from "lucide-react";

export const metadata = createPrivatePageMetadata(
  "Admin | Sigur.Ai",
  "/admin",
  "Panou de administrare Sigur.Ai."
);

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isAdminEmail(user.email)) redirect("/dashboard");

  const displayName = user.firstName || user.email.split("@")[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 pt-24 pb-12 sm:px-6 sm:pt-28 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2563EB]/10">
              <Shield className="h-5 w-5 text-[#2563EB]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                Admin Sigur.Ai
              </h1>
              <p className="mt-0.5 truncate text-sm text-gray-500">
                {displayName} · {user.email}
              </p>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <Link
              href="/"
              className="text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              Înapoi la site
            </Link>
            <LogoutButton />
          </div>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="shrink-0 lg:w-56">
            <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
              <AdminNav />
            </div>
          </aside>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
