"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/portal/AuthProvider";
import Link from "next/link";
import { User, LogOut, LayoutDashboard, ChevronDown, Shield } from "lucide-react";

function getDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}) {
  if (user.firstName?.trim()) return user.firstName.trim();
  return user.email.split("@")[0];
}

function getInitials(user: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}) {
  const first = user.firstName?.trim()?.[0] ?? "";
  const last = user.lastName?.trim()?.[0] ?? "";
  if (first && last) return `${first}${last}`.toUpperCase();
  if (first) return first.toUpperCase();
  return user.email[0]?.toUpperCase() ?? "U";
}

export default function HeaderAuthButton() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
    const displayName = getDisplayName(user);
    const initials = getInitials(user);

    return (
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-haspopup="menu"
          className={`flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-sm font-semibold transition-colors ${
            open
              ? "border-[#2563EB]/30 bg-[#2563EB]/5 text-[#2563EB]"
              : "border-gray-200 bg-white text-[#1E293B] hover:border-[#2563EB]/30 hover:text-[#2563EB]"
          }`}
        >
          <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-[#2563EB] text-xs font-bold text-white">
            {initials}
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
          </span>
          <span className="max-w-[7rem] truncate">{displayName}</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-gray-100 bg-white py-2 shadow-lg">
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="truncate text-sm font-semibold text-gray-900">
                {user.firstName
                  ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
                  : displayName}
              </p>
              <p className="truncate text-xs text-gray-500">{user.email}</p>
            </div>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <LayoutDashboard className="h-4 w-4 text-gray-400" />
              Polițele mele
            </Link>
            {user.isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Shield className="h-4 w-4 text-gray-400" />
                Admin
              </Link>
            )}
            <div className="mx-3 my-1 border-t border-gray-100" />
            <button
              type="button"
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
      className="flex items-center gap-2 text-sm font-semibold text-[#1E293B] hover:text-[#2563EB] transition-colors"
    >
      <User className="h-4 w-4" />
      Autentificare
    </Link>
  );
}
