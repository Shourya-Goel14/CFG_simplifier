import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import GraphPanel from './GraphPanel';
import { AlgorithmSection } from './GrammarDisplay';

/**
 * StepVisualizer — Orchestrates playback of algorithm sub-steps.
 *
 * Builds a unified "frame" timeline from the step metadata, then passes
 * the current frame to GraphPanel (for node/edge highlighting) and
 * AlgorithmSection (for progressive text reveal).
 */
export default function StepVisualizer({ 
  stepResult, 
  previousStepResult,
  onNext,
  onPrev,
  hasNext,
  hasPrev
}) {
  const [frameIndex, setFrameIndex] = useState(-1);  // -1 = show final result, >=0 = playing
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef(null);

  // ── Build unified frame timeline ──
  const frames = useMemo(() => {
    if (!stepResult || !stepResult.metadata) return [];
    const m = stepResult.metadata;
    const result = [];

    if (stepResult.stepNumber === 1 && m.nullableTrace && m.nullableTrace.length > 0) {
      // Step 1: each nullable variable discovered one by one
      const discovered = new Set();
      m.nullableTrace.forEach((t, i) => {
        discovered.add(t.var);
        result.push({
          description: `Found nullable: ${t.var}`,
          detail: t.reason,
          highlights: new Set([t.var]),
          discoveredSoFar: new Set(discovered),
          phase: 'nullable',
          traceIndex: i,
          frameIndex: result.length,
        });
      });
    }

    if (stepResult.stepNumber === 2 && m.unitTrace && m.unitTrace.length > 0) {
      // Step 2: each unit pair discovered
      const discoveredPairs = [];
      m.unitTrace.forEach((t, i) => {
        discoveredPairs.push(t);
        result.push({
          description: `Unit pair: ${t.from} → ${t.to}`,
          detail: t.reason,
          highlights: new Set([t.from, t.to]),
          discoveredSoFar: discoveredPairs.map(p => `${p.from}->${p.to}`),
          discoveredPairsObj: [...discoveredPairs],
          phase: 'unit',
          traceIndex: i,
          frameIndex: result.length,
        });
      });
    }

    if (stepResult.stepNumber === 3) {
      const genTrace = m.generativeTrace || [];
      const reachTrace = m.reachableTrace || [];
      const discoveredGen = new Set();
      const discoveredReach = new Set();

      // Phase 1: Generative
      genTrace.forEach((traceStr, i) => {
        // Parse "Pass N: Added {A, B} because ..."
        const match = traceStr.match(/Added \{([^}]+)\}/);
        const syms = match ? match[1].split(',').map(s => s.trim()) : [];
        syms.forEach(s => discoveredGen.add(s));
        result.push({
          description: traceStr,
          detail: null,
          highlights: new Set(syms),
          discoveredSoFar: new Set(discoveredGen),
          phase: 'generative',
          traceIndex: i,
          frameIndex: result.length,
        });
      });

      // Phase 2: Reachable
      reachTrace.forEach((traceStr, i) => {
        const match = traceStr.match(/\{([^}]+)\}/);
        const syms = match ? match[1].split(',').map(s => s.trim()) : [];
        syms.forEach(s => discoveredReach.add(s));
        result.push({
          description: traceStr,
          detail: null,
          highlights: new Set(syms),
          discoveredSoFar: new Set(discoveredReach),
          phase: 'reachable',
          traceIndex: i,
          frameIndex: result.length,
        });
      });
    }

    if (stepResult.stepNumber === 4) {
      result.push({
        description: `Final Cleanup: Removed ${m.duplicatesRemoved || 0} duplicate productions.`,
        detail: `The grammar now contains ${m.finalVariableCount || 0} unique variables and is fully simplified.`,
        highlights: new Set(),
        phase: 'cleanup',
        traceIndex: 0,
        frameIndex: 0,
      });
    }

    return result;
  }, [stepResult]);

  const maxFrame = frames.length - 1;

  // Auto-play when step data changes
  useEffect(() => {
    if (frames.length > 0) {
      setFrameIndex(0);
      setIsPlaying(true);
    } else {
      setFrameIndex(-1);
      setIsPlaying(false);
    }
  }, [stepResult, frames.length]);

  // Auto-play timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setFrameIndex(prev => {
          if (prev >= maxFrame) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1400);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, maxFrame]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
    } else if (frameIndex >= maxFrame) {
      // Finished — replay from start
      setFrameIndex(0);
      setIsPlaying(true);
    } else {
      // Start or resume
      if (frameIndex < 0) setFrameIndex(0);
      setIsPlaying(true);
    }
  }, [frameIndex, maxFrame, isPlaying]);

  const handlePrev = () => { setIsPlaying(false); setFrameIndex(Math.max(-1, frameIndex - 1)); };
  const handleNext = () => { setIsPlaying(false); setFrameIndex(Math.min(maxFrame, frameIndex + 1)); };
  const skipToEnd = () => { setIsPlaying(false); setFrameIndex(maxFrame); };
  const resetToFinal = () => { setIsPlaying(false); setFrameIndex(-1); };

  const [showCheckButton, setShowCheckButton] = useState(false);

  // Delay "Check Language" button at Step 4
  useEffect(() => {
    if (!hasNext) {
      setShowCheckButton(false);
      const timer = setTimeout(() => setShowCheckButton(true), 2500);
      return () => clearTimeout(timer);
    }
  }, [hasNext, stepResult]);

  const currentFrame = frameIndex >= 0 && frameIndex <= maxFrame ? frames[frameIndex] : null;
  const progress = frameIndex < 0 ? 0 : maxFrame === 0 ? 100 : (frameIndex / maxFrame) * 100;

  return (
    <div className="step-visualizer">
      <GraphPanel
        stepResult={stepResult}
        previousStepResult={previousStepResult}
        currentFrame={currentFrame}
        frameIndex={frameIndex}
      />

      {/* Playback Controls */}
      {frames.length > 0 && (
        <div className="playback-section">
          {/* Progress bar */}
          <div className="playback-progress-track">
            <div className="playback-progress-fill" style={{ width: `${progress}%` }} />
            {frames.map((f, i) => {
              const pct = frames.length === 1 ? 50 : (i / (frames.length - 1)) * 100;
              return (
                <button
                  key={i}
                  className={`playback-progress-dot ${i === frameIndex ? 'active' : ''} ${i < frameIndex ? 'past' : ''}`}
                  style={{ left: `${pct}%` }}
                  onClick={() => { setIsPlaying(false); setFrameIndex(i); }}
                  title={f.description}
                />
              );
            })}
          </div>

          {/* Controls row */}
          <div className="playback-controls" id="playback-controls">
            <button className="playback-btn" onClick={resetToFinal} title="Show Final Result" disabled={frameIndex === -1}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
            </button>
            <button className="playback-btn" onClick={handlePrev} disabled={frameIndex <= -1} title="Previous">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>
            </button>
            <button className="playback-btn playback-play" onClick={handlePlayPause} title={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              )}
            </button>
            <button className="playback-btn" onClick={handleNext} disabled={frameIndex >= maxFrame} title="Next">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
            </button>
            <button className="playback-btn" onClick={skipToEnd} disabled={frameIndex >= maxFrame} title="Skip to End">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
            </button>

            <span className="playback-counter">
              {frameIndex >= 0 ? `${frameIndex + 1} / ${frames.length}` : 'Final'}
            </span>
          </div>

          {/* Current frame description */}
          {currentFrame && (
            <div className="playback-description">
              <span className="playback-phase-badge">{currentFrame.phase}</span>
              <span className="playback-desc-text">{currentFrame.description}</span>
              {currentFrame.detail && (
                <span className="playback-detail-text">{currentFrame.detail}</span>
              )}
            </div>
          )}
          {!currentFrame && (
            <div className="playback-description playback-description-final">
              <span className="playback-phase-badge" style={{ background: 'rgba(100,116,139,0.1)', color: 'var(--text-muted)', borderColor: 'var(--border-primary)' }}>result</span>
              <span className="playback-desc-text" style={{ color: 'var(--text-muted)' }}>Showing final result — press ▶ Play to animate the algorithm</span>
            </div>
          )}
        </div>
      )}

      <AlgorithmSection
        stepNumber={stepResult?.stepNumber}
        stepResult={stepResult}
        frameIndex={frameIndex}
        frames={frames}
      />

      {/* Playback Sidebar - Dynamic sub-step information */}
      {currentFrame && (
        <div className="playback-sidebar">
          <div className="playback-sidebar-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="playback-phase-badge">{currentFrame.phase}</span>
              {hasNext && (
                <button className="sidebar-next-btn" onClick={onNext} title="Next Major Step">
                  Next Step →
                </button>
              )}
            </div>
            <button className="playback-sidebar-close" onClick={resetToFinal} title="Close Playback">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          
          <div className="playback-sidebar-body">
            <div className="playback-sidebar-step-num">Step {frameIndex + 1} of {frames.length}</div>
            <h3 className="playback-sidebar-desc">{currentFrame.description}</h3>
            {currentFrame.detail && (
              <div className="playback-sidebar-detail">
                <div className="detail-label">Reasoning</div>
                <p className="detail-text">{currentFrame.detail}</p>
              </div>
            )}
            
            <button 
              className="sidebar-details-btn" 
              onClick={() => {
                const el = document.getElementById('algorithm-details');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  // Flash highlight
                  el.style.transition = 'background 0.5s ease';
                  el.style.background = 'var(--accent-glow)';
                  setTimeout(() => { el.style.background = ''; }, 2000);
                }
              }}
              title="View algorithmic steps for this phase"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              View Algorithm Steps
            </button>
          </div>

          <div className="playback-sidebar-footer">
            <div className="playback-sidebar-mini-progress">
              <div className="mini-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            {hasNext ? (
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                 <button className="btn-primary sidebar-action-btn" onClick={onNext}>
                    Next Step →
                 </button>
              </div>
            ) : showCheckButton ? (
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                 <button className="btn-primary sidebar-action-btn btn-check-lang-sidebar animate-in" onClick={() => {
                   const input = document.querySelector('.recognizer-input');
                   if (input) {
                     input.focus();
                     input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                   }
                 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Check Language
                 </button>
              </div>
            ) : (
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', height: '40px' }}>
                {/* Space reserved for button */}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
