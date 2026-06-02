"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useWizardStepScroll } from "@/lib/hooks/useWizardStepScroll";

interface Step {
  title: string;
  subtitle?: string;
  content: React.ReactNode;
}

interface WizardStepperProps {
  steps: Step[];
  currentStep: number;
  onStepChange: (step: number) => void;
  remainingText?: string;
  /** Hide the horizontal stepper on mobile (banner still shown). */
  hideStepperOnMobile?: boolean;
  /** Show a slim progress bar under the mobile banner (e.g. RCA step 0). */
  showMobileProgress?: boolean;
}

export default function WizardStepper({
  steps,
  currentStep,
  onStepChange,
  remainingText,
  hideStepperOnMobile = false,
  showMobileProgress = false,
}: WizardStepperProps) {
  const rootRef = useWizardStepScroll(currentStep);
  const currentStepMeta = steps[currentStep];
  const progressPct = ((currentStep + 1) / steps.length) * 100;

  return (
    <div ref={rootRef} className="scroll-mt-20 sm:scroll-mt-24">
      {/* Mobile step banner */}
      <div className={`md:hidden ${hideStepperOnMobile ? "mb-3" : "mb-4"}`}>
        <p className="text-center text-sm font-semibold text-gray-900">
          Pas {currentStep + 1} din {steps.length} — {currentStepMeta?.title}
        </p>
        {showMobileProgress && (
          <div
            className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-200"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPct)}
            aria-label={`Pas ${currentStep + 1} din ${steps.length}`}
          >
            <div
              className="h-full rounded-full bg-[#2563EB] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </div>

      {/* Step indicators */}
      <nav className={`${hideStepperOnMobile ? "hidden md:block" : ""} ${hideStepperOnMobile ? "md:mb-8" : "mb-4 md:mb-8"}`}>
        {remainingText && (
          <p className="mb-3 text-center text-xs font-medium text-gray-500">
            {remainingText}
          </p>
        )}
        <ol className="flex items-center">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            return (
              <li
                key={index}
                className={`flex items-center ${index < steps.length - 1 ? "flex-1" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => isCompleted && onStepChange(index)}
                  disabled={!isCompleted}
                  className={`flex flex-col items-center gap-1 text-center text-sm font-medium ${
                    isCompleted
                      ? "cursor-pointer text-[#2563EB]"
                      : isCurrent
                        ? "text-[#2563EB]"
                        : "text-gray-400"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isCompleted
                        ? "bg-[#2563EB] text-white"
                        : isCurrent
                          ? "border-2 border-[#2563EB] text-[#2563EB]"
                          : "border-2 border-gray-300 text-gray-400"
                    }`}
                  >
                    {isCompleted ? "✓" : index + 1}
                  </span>
                  <span className="hidden max-w-24 text-xs leading-tight sm:block">{step.subtitle ?? step.title}</span>
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={`mx-2 mt-4 h-0.5 flex-1 self-start ${
                      isCompleted ? "bg-[#2563EB]" : "bg-gray-300"
                    }`}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step content */}
      <div>{steps[currentStep]?.content}</div>
    </div>
  );
}

export function useWizard(totalSteps: number) {
  const [currentStep, setCurrentStep] = useState(0);

  const next = () =>
    setCurrentStep((s) => Math.min(s + 1, totalSteps - 1));
  const prev = () => setCurrentStep((s) => Math.max(s - 1, 0));
  const goTo = (step: number) => {
    if (step >= 0 && step < totalSteps) setCurrentStep(step);
  };

  return { currentStep, next, prev, goTo, isFirst: currentStep === 0, isLast: currentStep === totalSteps - 1 };
}

/**
 * Hook to manage wizard state using the URL search params so the back button works.
 * Needs to be used inside a component that is wrapped in Suspense.
 */
export function useWizardUrlSync(totalSteps: number) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentStep = parseInt(searchParams.get("step") || "0", 10);

  const setStepInUrl = (stepIndex: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("step", stepIndex.toString());
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const next = () => {
    const nextStep = Math.min(currentStep + 1, totalSteps - 1);
    setStepInUrl(nextStep);
  };

  const prev = () => {
    const prevStep = Math.max(currentStep - 1, 0);
    setStepInUrl(prevStep);
  };

  const goTo = (step: number) => {
    if (step >= 0 && step < totalSteps) {
      setStepInUrl(step);
    }
  };

  return {
    currentStep,
    next,
    prev,
    goTo,
    isFirst: currentStep === 0,
    isLast: currentStep === totalSteps - 1,
  };
}
