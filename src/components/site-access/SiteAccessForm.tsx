"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { btn, inputClass } from "@/lib/ui/tokens";

function siteAccessErrorMessage(status: number, serverError?: string): string {
  if (serverError) return serverError;

  switch (status) {
    case 400:
      return "Cerere invalidă. Introduceți parola și încercați din nou.";
    case 401:
      return "Parolă incorectă. Folosiți exact valoarea din SITE_PREVIEW_PASSWORD (.env.local sau Vercel).";
    case 404:
      return "Accesul nu este restricționat momentan.";
    case 500:
      return "Eroare de configurare server (SITE_PREVIEW_PASSWORD lipsă sau invalid).";
    default:
      return `Eroare neașteptată (${status}). Încercați din nou.`;
  }
}

export default function SiteAccessForm() {
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
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setError(siteAccessErrorMessage(res.status, data.error));
        return;
      }

      // Full navigation so middleware sees the new httpOnly cookie (soft router.push can miss it on mobile).
      window.location.assign("/");
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
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
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
