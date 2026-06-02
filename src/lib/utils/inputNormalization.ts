/**
 * Uppercase normalization for typed text.
 * Keeps the original spacing untouched while normalizing letters.
 */
export function normalizeUppercaseInput(value: string): string {
  return value.toLocaleUpperCase("ro-RO");
}
