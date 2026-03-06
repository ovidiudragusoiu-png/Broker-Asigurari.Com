"use client";

import { useState, useRef, useCallback } from "react";
import { validateEmail, suggestEmailTypo } from "@/lib/utils/validation";

interface EmailInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  errorClassName?: string;
  /** Show format error when value is non-empty and invalid */
  showFormatError?: boolean;
  /** Custom label for the format error */
  formatErrorLabel?: string;
}

/**
 * Email input with:
 * 1. Common typo detection on blur (client-side, instant)
 * 2. MX record validation on blur (server-side, async)
 */
export default function EmailInput({
  value,
  onChange,
  placeholder = "exemplu@email.com",
  className = "",
  errorClassName = "",
  showFormatError = true,
  formatErrorLabel = "Email invalid",
}: EmailInputProps) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [mxWarning, setMxWarning] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  // Track which email was last MX-validated to avoid re-checking
  const lastChecked = useRef("");

  const formatInvalid = value.length > 0 && !validateEmail(value);
  const hasError = formatInvalid || !!mxWarning;

  const inputClass = hasError && value.length > 0
    ? errorClassName || className
    : className;

  const handleBlur = useCallback(async () => {
    // Clear previous warnings
    setSuggestion(null);
    setMxWarning(null);

    if (!value || !validateEmail(value)) return;

    // 1. Check for common domain typos (instant, client-side)
    const typoSuggestion = suggestEmailTypo(value);
    if (typoSuggestion) {
      setSuggestion(typoSuggestion);
      return; // Don't MX-check a typo'd domain
    }

    // 2. MX record check (server-side) — skip if already checked this email
    const trimmed = value.trim().toLowerCase();
    if (lastChecked.current === trimmed) return;

    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setChecking(true);
    try {
      const resp = await fetch("/api/email/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
        signal: controller.signal,
      });
      const result = await resp.json();
      lastChecked.current = trimmed;
      if (!result.valid) {
        setMxWarning("Acest domeniu de email nu pare sa existe. Verificati adresa.");
      }
    } catch {
      // Aborted or network error — don't block
    } finally {
      setChecking(false);
    }
  }, [value]);

  const acceptSuggestion = () => {
    if (suggestion) {
      onChange(suggestion);
      setSuggestion(null);
      setMxWarning(null);
      lastChecked.current = suggestion.toLowerCase();
    }
  };

  const dismissSuggestion = () => {
    setSuggestion(null);
  };

  return (
    <div>
      <input
        type="email"
        className={inputClass}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          // Clear warnings when user edits
          if (suggestion) setSuggestion(null);
          if (mxWarning) setMxWarning(null);
        }}
        onBlur={handleBlur}
      />

      {/* Format error */}
      {showFormatError && formatInvalid && (
        <p className="mt-1 text-xs text-red-500">{formatErrorLabel}</p>
      )}

      {/* Typo suggestion */}
      {suggestion && (
        <div className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 border border-amber-200">
          <span className="text-xs text-amber-700">
            Ati vrut sa scrieti{" "}
            <button
              type="button"
              onClick={acceptSuggestion}
              className="font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900"
            >
              {suggestion}
            </button>
            ?
          </span>
          <button
            type="button"
            onClick={dismissSuggestion}
            className="ml-auto text-xs text-amber-400 hover:text-amber-600"
          >
            Nu
          </button>
        </div>
      )}

      {/* MX validation warning */}
      {mxWarning && !suggestion && (
        <p className="mt-1 text-xs text-amber-600">{mxWarning}</p>
      )}

      {/* Checking indicator */}
      {checking && (
        <p className="mt-1 text-xs text-gray-400">Se verifica adresa...</p>
      )}
    </div>
  );
}
