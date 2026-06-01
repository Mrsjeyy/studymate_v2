import { TOUR_STEPS } from "../constants/tour";

/** Highlights a DOM element and shows a floating tooltip for the current tour step. */
export default function GuidedTourOverlay({ active, step, viewName, onNext, onPrev, onSkip }) {
  if (!active || !viewName || !TOUR_STEPS[viewName] || !TOUR_STEPS[viewName][step]) return null;

  const tourStep = TOUR_STEPS[viewName][step];
  const totalSteps = TOUR_STEPS[viewName].length;

  const targetEl = document.querySelector(tourStep.target);
  if (!targetEl) return null;

  const rect = targetEl.getBoundingClientRect();

  let modalTop = rect.bottom + 20;
  let modalLeft = Math.max(20, rect.left + rect.width / 2 - 160);
  if (window.innerHeight - rect.bottom < 250) modalTop = rect.top - 220;
  if (modalLeft + 320 > window.innerWidth) modalLeft = window.innerWidth - 340;

  return (
    <div className="tour-overlay">
      <div className="tour-highlight" style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }} />
      <div className="tour-modal" style={{ left: modalLeft, top: modalTop }}>
        <div className="tour-title">{tourStep.title}</div>
        <div className="tour-text">{tourStep.text}</div>
        <div className="tour-actions">
          <div className="tour-step-counter">{step + 1} von {totalSteps}</div>
          <button className="tour-btn tour-btn-skip" onClick={onSkip}>Überspringen</button>
          {step > 0 && <button className="tour-btn tour-btn-skip" onClick={onPrev}>Zurück</button>}
          <button className="tour-btn tour-btn-primary" onClick={onNext}>
            {step === totalSteps - 1 ? 'Fertig' : 'Weiter'}
          </button>
        </div>
      </div>
    </div>
  );
}
