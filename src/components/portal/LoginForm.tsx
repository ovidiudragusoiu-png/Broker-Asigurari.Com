"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/portal/AuthProvider";
import { btn, inputClass, inputError as inputErrClass } from "@/lib/ui/tokens";
import { LogIn } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Eroare la autentificare.");
        return;
      }

      await refresh();
      router.push("/dashboard");
    } catch {
      setError("Eroare de conexiune. Vă rugăm încercați din nou.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={error ? inputErrClass : inputClass}
          placeholder="adresa@email.com"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Parolă
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={error ? inputErrClass : inputClass}
          placeholder="Minim 8 caractere"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className={`${btn.primary} flex w-full items-center justify-center gap-2`}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <LogIn className="h-4 w-4" />
        )}
        {loading ? "Se autentifică..." : "Autentificare"}
      </button>

      <p className="text-center text-sm text-gray-500">
        Nu ai cont?{" "}
        <Link href="/register" className={btn.tertiary}>
          Creează cont
        </Link>
      </p>
    </form>
  );
}
