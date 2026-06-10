type EnvironmentOption = { code: string; name: string };

/** True when the selected environment is rural (PAD / house comparator codes vary). */
export function isRuralEnvironment(
  value: string,
  options?: EnvironmentOption[]
): boolean {
  if (!value.trim()) return false;
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("rural")) return true;
  const match = options?.find((o) => o.code === value);
  if (!match) return false;
  return (
    match.code.toLowerCase().includes("rural") ||
    match.name.toLowerCase().includes("rural")
  );
}
