"use client";

import { useEffect } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { ro } from "date-fns/locale/ro";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("ro", ro);

interface DateInputProps {
  value: string;
  onChange: (val: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
}

function parseDate(str: string): Date | null {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const inputCls =
  "w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 transition-colors duration-200 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none";

export default function DateInput({
  value,
  onChange,
  min,
  max,
  disabled = false,
  readOnly = false,
  className,
  placeholder = "Selectează data",
}: DateInputProps) {
  const selected = parseDate(value);
  const minDate = min ? parseDate(min) : undefined;
  const maxDate = max ? parseDate(max) : undefined;

  // Suppress hydration mismatch for date picker
  useEffect(() => {}, []);

  return (
    <DatePicker
      selected={selected}
      onChange={(date: Date | null) => {
        if (date) onChange(formatDate(date));
      }}
      dateFormat="dd/MM/yyyy"
      locale="ro"
      minDate={minDate ?? undefined}
      maxDate={maxDate ?? undefined}
      disabled={disabled}
      readOnly={readOnly}
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
      placeholderText={placeholder}
      className={className || inputCls}
      calendarClassName="broker-datepicker"
      autoComplete="off"
    />
  );
}
