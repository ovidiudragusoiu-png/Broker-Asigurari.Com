"use client";

import { useState } from "react";
import { btn } from "@/lib/ui/tokens";
import { Mail } from "lucide-react";

export default function ResendVerificationForm({
  email,
  initialMessage,
}: {
  email: string;
  initialMessage?: string;
}) {
  const [message, setMessage] = useState(initialMessage ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Nu am putut retrimite emailul.");
        return;
      }

      setMessage(
        data.message ||
          "Dacă există un cont neconfirmat cu acest email, vei primi un nou link."
      );
    } catch {
      setError("Eroare de conexiune. Încearcă din nou.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={handleResend}
        disabled={loading}
        className={`${btn.secondary} flex w-full items-center justify-center gap-2`}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
        ) : (
          <Mail className="h-4 w-4" />
        )}
        {loading ? "Se trimite..." : "Retrimite emailul de confirmare"}
      </button>
    </div>
  );
}
