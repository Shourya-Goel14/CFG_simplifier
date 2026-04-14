const STEP_LABELS = [
  { num: 1, label: 'ε-Remove' },
  { num: 2, label: 'Unit' },
  { num: 3, label: 'Useless' },
  { num: 4, label: 'Final' },
];

export default function StepNavigator({
  currentStep,
  totalSteps,
  stepData,
  onPrev,
  onNext,
}) {
  return (
    <div className="step-navigator">
      {/* Progress Bar */}
      <div className="step-progress">
        {STEP_LABELS.map((step, i) => {
          const isActive = currentStep === step.num;
          const isComplete = currentStep > step.num;
          const isPending = currentStep < step.num;

          return (
            <div key={step.num} className="step-node-wrapper">
              {/* Connector line */}
              {i > 0 && (
                <div
                  className={`step-connector ${
                    currentStep > step.num
                      ? 'step-connector-complete'
                      : currentStep === step.num
                        ? 'step-connector-active'
                        : ''
                  }`}
                />
              )}

              {/* Node */}
              <div
                className={`step-node ${
                  isActive
                    ? 'step-node-active'
                    : isComplete
                      ? 'step-node-complete'
                      : 'step-node-pending'
                }`}
              >
                {isComplete ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  step.num
                )}
              </div>

              {/* Label */}
              <span
                className={`step-label ${
                  isActive
                    ? 'step-label-active'
                    : isComplete
                      ? 'step-label-complete'
                      : 'step-label-pending'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step info */}
      {stepData && (
        <div className="step-info">
          <h3 className="step-info-title">
            Step {stepData.stepNumber}: {stepData.title}
          </h3>
          <p className="step-info-desc">{stepData.description}</p>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="step-nav-buttons">
        <button
          className="btn-nav"
          onClick={onPrev}
          disabled={currentStep <= 1}
          type="button"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Previous
        </button>
        <span className="step-counter">
          {currentStep} / {totalSteps}
        </span>
        <button
          className="btn-nav"
          onClick={onNext}
          disabled={currentStep >= totalSteps}
          type="button"
        >
          Next
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
}
