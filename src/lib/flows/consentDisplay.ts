/** Questions removed from UI — consultancy is handled via DntChoice waiver. */
export function isExcludedConsentQuestion(question: { label?: string }): boolean {
  const label = (question.label ?? "").trim();
  if (/^0\.3\b/i.test(label)) return true;
  if (/ACORDARE\s+CONSULTAN/i.test(label)) return true;
  return false;
}

/** Display broker name as Sigur.Ai in consent copy from InsureTech templates. */
export function formatConsentDisplayText(text: string): string {
  return text
    .replace(/MAXYGO\s+BROKER\s+DE\s+ASIGURARE\s+S\.?\s*R\.?\s*L\.?/gi, "Sigur.Ai")
    .replace(/MaxyGo\s+Broker\s+de\s+Asigurare\s+S\.?\s*R\.?\s*L\.?/gi, "Sigur.Ai")
    .replace(/MaxyGo\s+Broker/gi, "Sigur.Ai");
}
