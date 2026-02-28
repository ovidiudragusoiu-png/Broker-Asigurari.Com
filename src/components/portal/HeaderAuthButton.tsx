"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/portal/AuthProvider";
import Link from "next/link";
import { User, LogOut, LayoutDashboard } from "lucide-react";

export default function HeaderAuthButton() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (loading) return null;

  if (user) {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-sm font-semibold text-[#1E293B] hover:text-[#2563EB] transition-colors"
        >
          <User className="h-4 w-4" />
          Contul meu
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-gray-100 bg-white py-2 shadow-lg">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <LayoutDashboard className="h-4 w-4 text-gray-400" />
              Polițele mele
            </Link>
            <div className="mx-3 my-1 border-t border-gray-100" />
            <button
              onClick={async () => {
                setOpen(false);
                await logout();
                router.push("/");
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Deconectare
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="text-sm font-semibold text-[#1E293B] hover:text-[#2563EB] transition-colors"
    >
      Login
    </Link>
  );
}
