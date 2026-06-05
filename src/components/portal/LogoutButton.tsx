"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/portal/AuthProvider";
import { LogOut } from "lucide-react";
import { btn } from "@/lib/ui/tokens";

export default function LogoutButton() {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <button
      onClick={handleLogout}
      className={`${btn.secondary} flex w-full items-center justify-center gap-2 sm:w-auto`}
    >
      <LogOut className="h-4 w-4" />
      Deconectare
    </button>
  );
}
