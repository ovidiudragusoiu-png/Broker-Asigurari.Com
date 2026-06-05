"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { btn, inputClass } from "@/lib/ui/tokens";
import type {
  ReminderHistoryRow,
  ReminderSystemStatus,
  UpcomingReminderRow,
} from "@/lib/admin/reminderData";
import {
  Play,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Save,
} from "lucide-react";

interface ReminderPanelProps {
  status: ReminderSystemStatus;
  upcoming: UpcomingReminderRow[];
  history: ReminderHistoryRow[];
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        ok ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
      }`}
    >
      {ok ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <XCircle className="h-3 w-3" />
      )}
      {label}
    </span>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3">
      <span>
        <span className="block text-sm font-medium text-gray-900">{label}</span>
        <span className="mt-0.5 block text-xs text-gray-500">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]"
      />
    </label>
  );
}

export default function ReminderPanel({
  status,
  upcoming,
  history,
}: ReminderPanelProps) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [policyFilter, setPolicyFilter] = useState("");

  const [reminderDaysInput, setReminderDaysInput] = useState(
    status.reminderDaysInput
  );
  const [remindersEnabled, setRemindersEnabled] = useState(
    status.remindersEnabled
  );
  const [emailRemindersEnabled, setEmailRemindersEnabled] = useState(
    status.emailRemindersEnabled
  );
  const [smsRemindersEnabled, setSmsRemindersEnabled] = useState(
    status.smsRemindersEnabled
  );
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const saveSettings = async () => {
    setSaving(true);
    setSaveError("");
    setSaveMessage("");

    try {
      const res = await fetch("/api/admin/reminders/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reminderDayOffsets: reminderDaysInput,
          remindersEnabled,
          emailRemindersEnabled,
          smsRemindersEnabled,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Nu s-au putut salva setările.");
      }

      setSaveMessage("Setările au fost salvate.");
      router.refresh();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Nu s-au putut salva setările."
      );
    } finally {
      setSaving(false);
    }
  };

  const runReminders = async (dryRun: boolean) => {
    if (!dryRun && !window.confirm("Trimiți reminder-ele acum? Acțiunea nu poate fi anulată.")) {
      return;
    }

    setRunning(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/admin/reminders/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dryRun,
          policyNumber: policyFilter.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Eroare la rularea reminder-elor.");
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">Configurare reminder-e</h2>
        <p className="mt-1 text-sm text-gray-500">
          Modificările se aplică imediat la cron și la rulările manuale.
        </p>

        <div className="mt-5 space-y-4">
          <ToggleRow
            label="Reminder-e active"
            description="Dezactivează complet trimiterea automată și manuală."
            checked={remindersEnabled}
            onChange={setRemindersEnabled}
          />
          <ToggleRow
            label="Email"
            description="Trimite reminder-e prin Resend cu PDF atașat."
            checked={emailRemindersEnabled}
            onChange={setEmailRemindersEnabled}
            disabled={!remindersEnabled || !status.emailConfigured}
          />
          <ToggleRow
            label="SMS"
            description="Trimite SMS dacă Twilio este configurat și clientul are telefon."
            checked={smsRemindersEnabled}
            onChange={setSmsRemindersEnabled}
            disabled={!remindersEnabled || !status.smsConfigured}
          />

          <div>
            <label
              htmlFor="reminder-days"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Zile înainte de expirare
            </label>
            <input
              id="reminder-days"
              type="text"
              value={reminderDaysInput}
              onChange={(e) => setReminderDaysInput(e.target.value)}
              placeholder="30, 7, 1"
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Valori separate prin virgulă (1–365). Exemplu: 30, 14, 7, 1
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            className={`${btn.primary} inline-flex items-center gap-2`}
          >
            <Save className="h-4 w-4" />
            {saving ? "Se salvează..." : "Salvează setările"}
          </button>
          {saveMessage && (
            <span className="text-sm text-emerald-600">{saveMessage}</span>
          )}
          {saveError && (
            <span className="text-sm text-red-600">{saveError}</span>
          )}
        </div>

        {status.updatedAt && (
          <p className="mt-4 text-xs text-gray-400">
            Ultima actualizare:{" "}
            {formatDateTime(status.updatedAt)}
            {status.updatedByEmail ? ` · ${status.updatedByEmail}` : ""}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">Infrastructură</h2>
        <p className="mt-1 text-sm text-gray-500">
          Setări din variabile de mediu — se modifică în Vercel.
        </p>

        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Fus orar
            </dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">
              {status.timezone}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Cron Vercel
            </dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">
              {status.cronSchedule}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Site URL
            </dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">
              {status.siteUrl ?? "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap gap-2">
          <StatusBadge ok={status.emailConfigured} label="Email (Resend)" />
          <StatusBadge ok={status.smsConfigured} label="SMS (Twilio)" />
          <StatusBadge
            ok={status.cronSecretConfigured}
            label="CRON_SECRET"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">Acțiuni manuale</h2>
        <p className="mt-1 text-sm text-gray-500">
          Rulează job-ul de reminder-e (preview sau trimitere reală).
        </p>

        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Filtru număr poliță (opțional)
          </label>
          <input
            type="text"
            value={policyFilter}
            onChange={(e) => setPolicyFilter(e.target.value)}
            placeholder="ex. RCA-123456"
            className="w-full max-w-md rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => runReminders(true)}
            disabled={running}
            className={`${btn.secondary} inline-flex items-center gap-2`}
          >
            <Eye className="h-4 w-4" />
            {running ? "Se rulează..." : "Dry run (preview)"}
          </button>
          <button
            type="button"
            onClick={() => runReminders(false)}
            disabled={running}
            className={`${btn.primary} inline-flex items-center gap-2`}
          >
            <Play className="h-4 w-4" />
            {running ? "Se trimite..." : "Trimite acum"}
          </button>
        </div>

        {error && (
          <p className="mt-4 flex items-center gap-2 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        {result && (
          <pre className="mt-4 overflow-x-auto rounded-xl bg-gray-50 p-4 text-xs text-gray-700">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Programate azi ({upcoming.length})
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Polițe care intră în fereastra de reminder 30 / 7 / 1 zile.
        </p>

        {upcoming.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            Niciun reminder programat pentru azi.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-4">Poliță</th>
                  <th className="py-2 pr-4">Tip</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Reminder</th>
                  <th className="py-2">Expiră în</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((row) => (
                  <tr
                    key={`${row.policyDbId}-${row.reminderDays}`}
                    className="border-b border-gray-50"
                  >
                    <td className="py-2.5 pr-4 font-medium text-gray-900">
                      {row.policyNumber ?? "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-600">
                      {row.productLabel}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-600">{row.email}</td>
                    <td className="py-2.5 pr-4 text-gray-600">
                      {row.reminderDays} zile
                    </td>
                    <td className="py-2.5 text-gray-600">
                      {row.daysUntilExpiry} zile
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">Istoric recent</h2>
        <p className="mt-1 text-sm text-gray-500">
          Ultimele {history.length} reminder-e trimise.
        </p>

        {history.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">Niciun reminder înregistrat.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-4">Data</th>
                  <th className="py-2 pr-4">Poliță</th>
                  <th className="py-2 pr-4">Canal</th>
                  <th className="py-2 pr-4">Zile</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Eroare</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50">
                    <td className="py-2.5 pr-4 whitespace-nowrap text-gray-600">
                      {formatDateTime(row.sentAt)}
                    </td>
                    <td className="py-2.5 pr-4 font-medium text-gray-900">
                      {row.policyNumber ?? "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-600">
                      {row.channel === "sms" ? "SMS" : "Email"}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-600">
                      {row.reminderDays}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.success
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {row.success ? "OK" : "Eșuat"}
                      </span>
                    </td>
                    <td className="py-2.5 max-w-xs truncate text-gray-500">
                      {row.errorMessage ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
