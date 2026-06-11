import { useRef, useState } from "react";

/**
 * Persists DNT + agreements completion for a person key (CNP/CUI).
 * After first successful consent, advancing from the person step skips DNT/acorduri
 * until the person key changes.
 */
export function useConsentWizardPersistence<TAnswers>(initialAnswers: TAnswers) {
  const [agreementAnswers, setAgreementAnswers] = useState(initialAnswers);
  const [dntWaiverAccepted, setDntWaiverAccepted] = useState(false);
  const [consentCompleted, setConsentCompleted] = useState(false);
  const consentPersonKeyRef = useRef<string | null>(null);

  const syncPersonKey = (personKey: string) => {
    const key = personKey.trim();
    if (!key) return;
    if (consentPersonKeyRef.current && consentPersonKeyRef.current !== key) {
      setConsentCompleted(false);
      setAgreementAnswers(initialAnswers);
      setDntWaiverAccepted(false);
    }
  };

  const shouldSkipConsentFlow = (personKey: string) => {
    const key = personKey.trim();
    return Boolean(key) && consentCompleted && consentPersonKeyRef.current === key;
  };

  const markConsentCompleted = (personKey: string) => {
    const key = personKey.trim();
    consentPersonKeyRef.current = key;
    setConsentCompleted(true);
  };

  return {
    agreementAnswers,
    setAgreementAnswers,
    dntWaiverAccepted,
    setDntWaiverAccepted,
    consentCompleted,
    syncPersonKey,
    shouldSkipConsentFlow,
    markConsentCompleted,
  };
}
