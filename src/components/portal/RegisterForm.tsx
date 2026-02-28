"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/portal/AuthProvider";
import { btn, inputClass, inputError as inputErrClass } from "@/lib/ui/tokens";
import { UserPlus } from "lucide-react";

export default function RegisterForm() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Parola trebuie să aibă minim 8 caractere.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Parolele nu coincid.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Eroare la înregistrare.");
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="firstName"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Prenume
          </label>
          <input
            id="firstName"
            type="text"
            autoComplete="given-name"
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            className={inputClass}
            placeholder="Ion"
          />
        </div>
        <div>
          <label
            htmlFor="lastName"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Nume
          </label>
          <input
            id="lastName"
            type="text"
            autoComplete="family-name"
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            className={inputClass}
            placeholder="Popescu"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          className={error ? inputErrClass : inputClass}
          placeholder="adresa@email.com"
        />
      </div>

      <div>
        <label
          htmlFor="phone"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Telefon
        </label>
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          className={inputClass}
          placeholder="07XX XXX XXX"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Parolă <span className="text-red-500">*</span>
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          className={error ? inputErrClass : inputClass}
          placeholder="Minim 8 caractere"
        />
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Confirmă parola <span className="text-red-500">*</span>
        </label>
        <input
          id="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={(e) => update("confirmPassword", e.target.value)}
          className={error ? inputErrClass : inputClass}
          placeholder="Repetă parola"
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
          <UserPlus className="h-4 w-4" />
        )}
        {loading ? "Se creează contul..." : "Creează cont"}
      </button>

      <p className="text-center text-sm text-gray-500">
        Ai deja cont?{" "}
        <Link href="/login" className={btn.tertiary}>
          Autentifică-te
        </Link>
      </p>
    </form>
  );
}
