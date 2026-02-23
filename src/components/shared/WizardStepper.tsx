"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface Step {
  title: string;
  content: React.ReactNode;
}

interface WizardStepperProps {
  steps: Step[];
  currentStep: number;
  onStepChange: (step: number) => void;
}

export default function WizardStepper({
  steps,
  currentStep,
  onStepChange,
}: WizardStepperProps) {
  return (
    <div>
      {/* Step indicators */}
      <nav className="mb-8">
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
                  className={`flex items-center gap-2 text-sm font-medium ${
                    isCompleted
                      ? "cursor-pointer text-sky-600"
                      : isCurrent
                        ? "text-sky-600"
                        : "text-gray-400"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isCompleted
                        ? "bg-sky-600 text-white"
                        : isCurrent
                          ? "border-2 border-sky-600 text-sky-600"
                          : "border-2 border-gray-300 text-gray-400"
                    }`}
                  >
                    {isCompleted ? "✓" : index + 1}
                  </span>
                  <span className="hidden sm:inline">{step.title}</span>
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 ${
                      isCompleted ? "bg-sky-600" : "bg-gray-300"
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
