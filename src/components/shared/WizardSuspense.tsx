import { Suspense, type ReactNode } from "react";

export function WizardSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-gray-500">Se încarcă...</div>
      }
    >
      {children}
    </Suspense>
  );
}
