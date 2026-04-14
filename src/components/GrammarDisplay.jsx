import { useEffect, useRef, useMemo } from 'react';

/**
 * Algorithm steps for each transformation stage.
 */
const STEP_ALGORITHMS = {
  1: (metadata) => ({
    title: 'How to Eliminate ε-Productions',
    steps: [
      {
        text: `Identify all Nullable variables (those that can derive ε).`,
        traces: metadata?.nullableTrace?.map(t => `${t.var}: ${t.reason}`) || [],
        phase: 'nullable',
      },
      { text: 'For each production containing a Nullable variable, generate all combinations by including/excluding each Nullable occurrence.' },
      { text: 'Remove all original ε-productions (A → ε) from the grammar.' },
      { text: 'Add the newly generated combinations as new productions (avoid duplicates).' },
      { text: 'If the Start symbol was Nullable, keep its ε-production if necessary.' },
    ],
  }),
  2: (metadata) => ({
    title: 'How to Eliminate Unit Productions',
    steps: [
      { text: 'Identify all Unit productions (rules of the form A → B).' },
      {
        text: `Compute the Unit closure for variables via BFS and identify unit pairs.`,
        traces: metadata?.unitTrace?.map(t => `${t.from}→${t.to}: ${t.reason}`) || [],
        phase: 'unit',
      },
      { text: 'For each variable B in the closure of A, copy all non-unit productions of B as productions of A.' },
      { text: 'Remove all original Unit productions from the grammar.' },
    ],
  }),
  3: (metadata) => ({
    title: 'How to Eliminate Useless Symbols',
    steps: [
      {
        text: `Phase 1 — Find Generating Symbols: Keep symbols that derive strings of terminals.`,
        traces: metadata?.generativeTrace || [],
        phase: 'generative',
      },
      { text: 'Remove all productions involving non-generating variables.' },
      {
        text: `Phase 2 — Find Reachable Symbols: Start from Start symbol and find all reachable symbols.`,
        traces: metadata?.reachableTrace || [],
        phase: 'reachable',
      },
      { text: 'Remove all productions involving unreachable symbols.' },
    ],
  }),
  4: (metadata) => ({
    title: 'Final Cleanup',
    steps: [
      { text: `Scan all productions and remove exact duplicates. Removed: ${metadata?.duplicatesRemoved || 0} duplicates.` },
      { text: `Verify the grammar has a valid Start symbol and count final variables. Final variable count: ${metadata?.finalVariableCount || 0}.` },
      { text: 'The resulting grammar is equivalent to the original but in its simplest form.' },
    ],
  }),
};

/**
 * AlgorithmSection — progressive reveal of algorithm trace steps.
 *
 * Props:
 *   frameIndex: -1 = show all (final), >=0 = show traces up to that frame
 *   frames: the unified frame timeline from StepVisualizer
 */
export function AlgorithmSection({ stepNumber, stepResult, frameIndex = -1, frames = [] }) {
  const metadata = stepResult?.metadata || {};

  const isPlayback = frameIndex >= 0;
  const algoGen = STEP_ALGORITHMS[stepNumber];

  // Determine current frame info (safe even if algoGen is null)
  const currentFrame = isPlayback && frameIndex < frames.length ? frames[frameIndex] : null;
  const currentPhase = currentFrame?.phase || null;
  const currentTraceIdx = currentFrame?.traceIndex ?? -1;

  if (!algoGen) return null;
  const algo = algoGen(metadata);

  return (
    <div className="algorithm-section" id="algorithm-details">
      <div className="algorithm-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
        {algo.title}
      </div>
      <ol className="algorithm-steps">
        {algo.steps.map((s, i) => {
          const stepPhase = s.phase || null;
          const hasTraces = s.traces && s.traces.length > 0;

          // Determine how many traces to show for this step
          let visibleTraceCount = hasTraces ? s.traces.length : 0;
          let activeTraceIndex = -1;

          if (isPlayback && hasTraces && stepPhase) {
            if (stepPhase === currentPhase) {
              // This step's phase is the one currently playing
              visibleTraceCount = currentTraceIdx + 1;
              activeTraceIndex = currentTraceIdx;
            } else {
              // Check if this phase has already been fully played
              const phaseDone = frames.some((f, fi) => f.phase === stepPhase && fi < frameIndex);
              const phaseNotStarted = !frames.some((f, fi) => f.phase === stepPhase && fi <= frameIndex);
              
              if (phaseNotStarted) {
                visibleTraceCount = 0;
              } else if (phaseDone && currentPhase !== stepPhase) {
                // This phase is fully done, show all
                visibleTraceCount = s.traces.length;
              }
            }
          }

          return (
            <li key={i} className="algorithm-step">
              <div className="algorithm-step-text">{s.text}</div>
              {hasTraces && visibleTraceCount > 0 && (
                <ul className="algorithm-trace-list">
                  {s.traces.slice(0, visibleTraceCount).map((traceText, ti) => {
                    const isActive = (isPlayback && ti === activeTraceIndex);
                    return (
                      <li
                        key={ti}
                        className={`algorithm-trace-item ${isActive ? 'algorithm-trace-active' : ''} ${!isPlayback ? '' : ti < activeTraceIndex ? 'algorithm-trace-past' : ''}`}
                      >
                        <span className="algorithm-trace-number">{ti + 1}</span>
                        {traceText}
                      </li>
                    );
                  })}
                </ul>
              )}
              {hasTraces && isPlayback && visibleTraceCount === 0 && (
                <div className="algorithm-trace-pending">
                  <span>⏳ Waiting…</span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * GrammarDisplay — shows before/after grammar and changes.
 */
export default function GrammarDisplay({ stepResult, previousGrammar }) {
  // Group current productions by LHS
  const grouped = useMemo(() => {
    if (!stepResult) return {};
    const g = {};
    for (const p of stepResult.grammar.productions) {
      if (!g[p.lhs]) g[p.lhs] = [];
      g[p.lhs].push(p);
    }
    return g;
  }, [stepResult]);

  // Group previous grammar productions by LHS
  const prevGrouped = useMemo(() => {
    if (!previousGrammar) return {};
    const g = {};
    for (const p of previousGrammar.productions) {
      if (!g[p.lhs]) g[p.lhs] = [];
      g[p.lhs].push(p);
    }
    return g;
  }, [previousGrammar]);

  const addedKeys = useMemo(() => {
    if (!stepResult) return new Set();
    return new Set(
      stepResult.changes
        .filter((c) => c.type === 'added')
        .map((c) => c.production.lhs + '→' + c.production.rhs.join(' '))
    );
  }, [stepResult]);

  const removedProductions = useMemo(() => {
    if (!stepResult) return [];
    return stepResult.changes.filter((c) => c.type === 'removed');
  }, [stepResult]);

  const addedProductions = useMemo(() => {
    if (!stepResult) return [];
    return stepResult.changes.filter((c) => c.type === 'added');
  }, [stepResult]);

  const removedGrouped = useMemo(() => {
    const g = {};
    for (const c of removedProductions) {
      const p = c.production;
      if (!g[p.lhs]) g[p.lhs] = [];
      g[p.lhs].push(p);
    }
    return g;
  }, [removedProductions]);

  if (!stepResult) {
    return (
      <div className="grammar-display grammar-display-empty">
        <div className="grammar-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <p>Enter a grammar and click <strong>Simplify</strong> to begin</p>
        </div>
      </div>
    );
  }

  const sortedVars = Object.keys(grouped).sort((a, b) => {
    if (a === stepResult.grammar.start) return -1;
    if (b === stepResult.grammar.start) return 1;
    return a.localeCompare(b);
  });

  const prevSortedVars = previousGrammar
    ? Object.keys(prevGrouped).sort((a, b) => {
        if (a === previousGrammar.start) return -1;
        if (b === previousGrammar.start) return 1;
        return a.localeCompare(b);
      })
    : [];

  const removedOnlyVars = Object.keys(removedGrouped).filter(
    (v) => !grouped[v]
  );

  return (
    <div className="grammar-display">
      {/* ── BEFORE Grammar ── */}
      {previousGrammar && (
        <div className="before-after-section before-section">
          <div className="before-after-label">
            <span className="before-after-dot before-dot" />
            Before — Input Grammar
          </div>
          <div className="grammar-productions before-productions">
            {prevSortedVars.map((v) => (
              <div key={v} className="grammar-line grammar-line-before">
                <span className="grammar-lhs" style={{ color: '#888' }}>
                  {v === previousGrammar.start && (
                    <span className="grammar-start-marker" title="Start">◎</span>
                  )}
                  {v}
                </span>
                <span className="grammar-arrow">→</span>
                <span className="grammar-rhs-group">
                  {prevGrouped[v].map((p, i) => (
                    <span key={i}>
                      {i > 0 && <span className="grammar-pipe">|</span>}
                      <span className="grammar-rhs">
                        {p.rhs.map((sym, si) => (
                          <span
                            key={si}
                            style={{
                              color: sym === 'ε' ? '#F59E0B'
                                : /^[A-Z]$/.test(sym) ? '#888'
                                : '#666',
                              fontStyle: sym === 'ε' ? 'italic' : 'normal',
                            }}
                          >
                            {sym}
                          </span>
                        ))}
                      </span>
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* ── AFTER Grammar (Result) ── */}
      <div className="before-after-section after-section">
        <div className="grammar-display-header">
          <h3 className="grammar-display-title">
            <span className="before-after-dot after-dot" />
            After — Result Grammar
          </h3>
          <span className="grammar-display-badge">
            Step {stepResult.stepNumber}
          </span>
        </div>

        <div className="grammar-productions">
          {stepResult.grammar.productions.length === 0 ? (
            <div className="grammar-empty-warning">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>Grammar generates empty language</span>
            </div>
          ) : (
            sortedVars.map((v) => (
              <div key={v} className="grammar-line">
                <span className="grammar-lhs">
                  {v === stepResult.grammar.start && (
                    <span className="grammar-start-marker" title="Start symbol">◎</span>
                  )}
                  {v}
                </span>
                <span className="grammar-arrow">→</span>
                <span className="grammar-rhs-group">
                  {grouped[v].map((p, i) => {
                    const key = p.lhs + '→' + p.rhs.join(' ');
                    const isAdded = addedKeys.has(key);
                    return (
                      <span key={i}>
                        {i > 0 && <span className="grammar-pipe">|</span>}
                        <span
                          className={`grammar-rhs ${isAdded ? 'grammar-rhs-added' : ''}`}
                        >
                          {p.rhs.map((sym, si) => (
                            <span
                              key={si}
                              className={
                                sym === 'ε'
                                  ? 'grammar-sym-epsilon'
                                  : /^[A-Z]$/.test(sym)
                                    ? 'grammar-sym-var'
                                    : 'grammar-sym-term'
                              }
                            >
                              {sym}
                            </span>
                          ))}
                        </span>
                      </span>
                    );
                  })}
                </span>
              </div>
            ))
          )}

          {/* Removed productions with strikethrough */}
          {removedOnlyVars.map((v) => (
            <div key={v} className="grammar-line grammar-line-removed">
              <span className="grammar-lhs grammar-lhs-removed">{v}</span>
              <span className="grammar-arrow">→</span>
              <span className="grammar-rhs-group">
                {removedGrouped[v].map((p, i) => (
                  <span key={i}>
                    {i > 0 && <span className="grammar-pipe">|</span>}
                    <span className="grammar-rhs grammar-rhs-removed">
                      {p.rhs.join(' ')}
                    </span>
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
      {/* Metadata Callout */}
      <MetadataCallout stepResult={stepResult} />

      {/* ── Changes Summary ── */}
      {(removedProductions.length > 0 || addedProductions.length > 0) && (
        <div className="changes-summary">
          <div className="changes-summary-title">
            Changes Made
          </div>
          <div className="changes-list">
            {removedProductions.map((c, i) => (
              <div key={`rm-${i}`} className="change-item change-item-removed">
                <span className="change-badge change-badge-removed">removed</span>
                <span>{c.production.lhs} → {c.production.rhs.join(' ')}</span>
              </div>
            ))}
            {addedProductions.map((c, i) => (
              <div key={`add-${i}`} className="change-item change-item-added">
                <span className="change-badge change-badge-added">added</span>
                <span>{c.production.lhs} → {c.production.rhs.join(' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetadataCallout({ stepResult }) {
  const { stepNumber, metadata } = stepResult;

  let content = null;

  if (stepNumber === 1 && metadata.nullableSet) {
    const nullVars = Array.from(metadata.nullableSet).sort().join(', ');
    content = (
      <>
        <span className="callout-label">Nullable variables:</span>
        <span className="callout-set">
          {'{ '}{nullVars || '∅'}{' }'}
        </span>
      </>
    );
  } else if (stepNumber === 2 && metadata.unitPairs) {
    const pairs = metadata.unitPairs
      .map(([a, b]) => `${a}→${b}`)
      .join(', ');
    content = (
      <>
        <span className="callout-label">Unit pairs removed:</span>
        <span className="callout-set">{pairs || 'none'}</span>
      </>
    );
  } else if (stepNumber === 3) {
    const ng = metadata.nonGenerating ? Array.from(metadata.nonGenerating).sort().join(', ') : '';
    const nr = metadata.nonReachable ? Array.from(metadata.nonReachable).sort().join(', ') : '';
    content = (
      <>
        <span className="callout-label">Non-generating:</span>
        <span className="callout-set">{'{ '}{ng || '∅'}{' }'}</span>
        <span className="callout-separator">·</span>
        <span className="callout-label">Non-reachable:</span>
        <span className="callout-set">{'{ '}{nr || '∅'}{' }'}</span>
      </>
    );
  } else if (stepNumber === 4) {
    content = (
      <>
        <span className="callout-label">Duplicates removed:</span>
        <span className="callout-value">{metadata.duplicatesRemoved}</span>
        <span className="callout-separator">·</span>
        <span className="callout-label">Final variables:</span>
        <span className="callout-value">{metadata.finalVariableCount}</span>
      </>
    );
  }

  if (!content) return null;

  return (
    <div className="grammar-callout">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
      <div className="callout-content">{content}</div>
    </div>
  );
}
