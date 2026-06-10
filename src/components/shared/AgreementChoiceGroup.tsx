"use client";

const defaultCheckboxClass =
  "mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 accent-[#2563EB] focus:ring-[#2563EB]";

interface AgreementChoiceGroupProps<T extends string> {
  value: T | "";
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  checkboxClass?: string;
}

/** Mutually exclusive options rendered as checkboxes (same UX as RCA DNT). */
export default function AgreementChoiceGroup<T extends string>({
  value,
  options,
  onChange,
  checkboxClass = defaultCheckboxClass,
}: AgreementChoiceGroupProps<T>) {
  return (
    <div className="space-y-2">
      {options.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-start gap-2 text-sm text-gray-700"
        >
          <input
            type="checkbox"
            checked={value !== "" && value === option.value}
            onChange={() => onChange(option.value)}
            className={checkboxClass}
          />
          <span className="leading-snug">{option.label}</span>
        </label>
      ))}
    </div>
  );
}

export { defaultCheckboxClass as agreementCheckboxClass };
