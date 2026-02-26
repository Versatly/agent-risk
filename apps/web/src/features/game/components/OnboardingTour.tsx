import { useMemo, useState } from "react";

const STORAGE_KEY = "risk-onboarding-dismissed";

interface OnboardingTourProps {
  visible: boolean;
  onClose: () => void;
}

const steps = [
  {
    title: "Welcome Commander",
    body: "Select territories directly on the board map to claim, reinforce, attack, and fortify.",
  },
  {
    title: "Follow Turn Phases",
    body: "Each turn follows Reinforce → Attack → Fortify. Use the Command Console to submit legal actions.",
  },
  {
    title: "Cards and Momentum",
    body: "Conquer at least one territory in a turn to earn a card. Trade 3 cards to gain large reinforcement boosts.",
  },
];

export function OnboardingTour({ visible, onClose }: OnboardingTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = useMemo(() => steps[stepIndex], [stepIndex]);

  if (!visible) {
    return null;
  }

  return (
    <div className="onboarding-backdrop">
      <div className="onboarding-card panel stack gap-md">
        <h2>{step.title}</h2>
        <p>{step.body}</p>
        <div className="row between">
          <button
            onClick={() => {
              localStorage.setItem(STORAGE_KEY, "true");
              onClose();
            }}
          >
            Don’t show again
          </button>
          <div className="row gap-sm">
            <button
              onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
              disabled={stepIndex === 0}
            >
              Back
            </button>
            {stepIndex < steps.length - 1 ? (
              <button
                className="primary"
                onClick={() => setStepIndex((index) => index + 1)}
              >
                Next
              </button>
            ) : (
              <button className="primary" onClick={onClose}>
                Start Playing
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function shouldShowOnboarding() {
  return localStorage.getItem(STORAGE_KEY) !== "true";
}
