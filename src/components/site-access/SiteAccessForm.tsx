"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { btn, inputClass } from "@/lib/ui/tokens";

export default function SiteAccessForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/site-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Parolă incorectă.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Eroare de conexiune. Încercați din nou.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 text-left">
      <label
        htmlFor="site-access-password"
        className="mb-1.5 block text-sm font-medium text-brand-text"
      >
        Parolă de acces
      </label>
      <input
        id="site-access-password"
        type="password"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={inputClass}
        placeholder="Introduceți parola"
        disabled={loading}
      />
      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className={`${btn.primary} mt-4 inline-flex w-full items-center justify-center gap-2`}
      >
        <Lock className="h-4 w-4" aria-hidden />
        {loading ? "Se verifică..." : "Accesează site-ul"}
      </button>
    </form>
  );
}
