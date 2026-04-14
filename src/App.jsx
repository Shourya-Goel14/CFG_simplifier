import { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import InputPanel from './components/InputPanel';
import StepNavigator from './components/StepNavigator';
import GrammarDisplay from './components/GrammarDisplay';
import StepVisualizer from './components/StepVisualizer';
import RecognizerPanel from './components/RecognizerPanel';
import EquivalencePanel from './components/EquivalencePanel';
import { parseGrammar } from './logic/cfgParser';
import { runPipeline } from './logic/cfgPipeline';
import GrammarTheoryDashboard from './components/GrammarTheoryDashboard';

/**
 * Helper to serialize grammar (converts internal Sets to Arrays for JSON)
 */
function serializeGrammar(g) {
  if (!g) return null;
  return {
    ...g,
    variables: Array.from(g.variables || []),
    terminals: Array.from(g.terminals || []),
  };
}

/**
 * Helper to deserialize grammar (restores Sets from stored Arrays)
 */
function deserializeGrammar(g) {
  if (!g) return null;
  return {
    ...g,
    variables: new Set(Array.isArray(g.variables) ? g.variables : []),
    terminals: new Set(Array.isArray(g.terminals) ? g.terminals : []),
  };
}

/**
 * Helper to serialize state for storage (converts all Sets to Arrays)
 */
function serializeState(state) {
  try {
    const { steps, originalGrammar, ...rest } = state;
    let serializedSteps = null;
    if (steps) {
      serializedSteps = steps.map(s => {
        const sg = serializeGrammar(s.grammar);
        if (!s.metadata) return { ...s, grammar: sg };
        const m = s.metadata;
        const newM = { ...m };
        // Convert specific Sets to Arrays
        if (m.nullableSet instanceof Set) newM.nullableSet = Array.from(m.nullableSet);
        if (m.generativeSymbols instanceof Set) newM.generativeSymbols = Array.from(m.generativeSymbols);
        if (m.reachableSymbols instanceof Set) newM.reachableSymbols = Array.from(m.reachableSymbols);
        if (m.nonGenerating instanceof Set) newM.nonGenerating = Array.from(m.nonGenerating);
        if (m.nonReachable instanceof Set) newM.nonReachable = Array.from(m.nonReachable);
        if (m.unreachable instanceof Set) newM.unreachable = Array.from(m.unreachable);
        return { ...s, grammar: sg, metadata: newM };
      });
    }
    return JSON.stringify({ 
      ...rest, 
      originalGrammar: serializeGrammar(originalGrammar),
      steps: serializedSteps 
    });
  } catch (e) {
    console.error('Failed to serialize state', e);
    return null;
  }
}

/**
 * Helper to deserialize state from storage (restores all Sets)
 */
function deserializeState(json) {
  try {
    if (!json) return null;
    const data = JSON.parse(json);
    if (data.originalGrammar) {
      data.originalGrammar = deserializeGrammar(data.originalGrammar);
    }
    if (data.steps) {
      data.steps = data.steps.map(s => {
        const dg = deserializeGrammar(s.grammar);
        if (!s.metadata) return { ...s, grammar: dg };
        const m = s.metadata;
        const newM = { ...m };
        // Restore Sets from Arrays
        if (Array.isArray(m.nullableSet)) newM.nullableSet = new Set(m.nullableSet);
        if (Array.isArray(m.generativeSymbols)) newM.generativeSymbols = new Set(m.generativeSymbols);
        if (Array.isArray(m.reachableSymbols)) newM.reachableSymbols = new Set(m.reachableSymbols);
        if (Array.isArray(m.nonGenerating)) newM.nonGenerating = new Set(m.nonGenerating);
        if (Array.isArray(m.nonReachable)) newM.nonReachable = new Set(m.nonReachable);
        if (Array.isArray(m.unreachable)) newM.unreachable = new Set(m.unreachable);
        return { ...s, grammar: dg, metadata: newM };
      });
    }
    return data;
  } catch (e) {
    console.error('Failed to deserialize state', e);
    return null;
  }
}

export default function App() {
  // ── Sync Initialization ──
  const [initialData] = useState(() => {
    const saved = localStorage.getItem('cfg_simplifier_state');
    return saved ? deserializeState(saved) : null;
  });

  const [activeTab, setActiveTab] = useState(initialData?.activeTab || 'simplifier');
  const [steps, setSteps] = useState(initialData?.steps || null);
  const [currentStep, setCurrentStep] = useState(initialData?.currentStep || 1);
  const [originalGrammar, setOriginalGrammar] = useState(initialData?.originalGrammar || null);
  const [isLoading, setIsLoading] = useState(false);

  // Interaction: Background effects
  useEffect(() => {
    const handleMouseMove = (e) => {
      document.body.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.body.style.setProperty('--mouse-y', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // ── Persistence: Save state on change ──
  useEffect(() => {
    const state = { activeTab, steps, currentStep, originalGrammar };
    localStorage.setItem('cfg_simplifier_state', serializeState(state));
  }, [activeTab, steps, currentStep, originalGrammar]);

  const handleSubmit = useCallback(async ({ startSymbol, rows }) => {
    const grammar = parseGrammar(rows, startSymbol);
    setOriginalGrammar(grammar);
    setSteps(null);
    setIsLoading(true);

    try {
      const results = await runPipeline(grammar);
      setSteps(results);
      setCurrentStep(1);
    } catch (err) {
      console.error('Pipeline failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const currentStepData = steps ? steps[currentStep - 1] : null;
  const previousStepData =
    steps && currentStep > 1 ? steps[currentStep - 2] : null;

  // ── Auto-scroll to visualizer on step change ──
  useEffect(() => {
    if (steps && !isLoading) {
      const timer = setTimeout(() => {
        const el = document.getElementById('playback-controls');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentStep, !!steps, isLoading]);

  // Get the final simplified grammar for the recognizer
  const simplifiedGrammar = steps ? steps[steps.length - 1].grammar : null;

  return (
    <div className="app">
      <Header activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />

      <main className="main-content">
        {/* ──────────────── SIMPLIFIER TAB ──────────────── */}
        {activeTab === 'simplifier' && (
          <>
            {/* Hero + Feature Cards */}
            {!isLoading && (
              <section className="hero-section">
                {/* Background glow effects */}
                <div className="hero-bg-effects">
                  <div className="hero-glow hero-glow-1" />
                  <div className="hero-glow hero-glow-2" />
                  <div className="hero-grid-overlay" />
                </div>

                <div className="hero-content">
                  <h1 className="hero-title">
                    CFG Grammar<br />
                    <span className="hero-title-dim">Simplifier</span>
                  </h1>
                  <p className="hero-subtitle">
                    A pristine environment for studying and converting Context-Free Grammars.<br />
                    Built for mathematical precision and visual clarity.
                  </p>
                  
                  <div className="hero-cta-group" style={{ marginTop: '2.5rem' }}>
                    <a href="#converter-section" className="btn-primary" style={{ textDecoration: 'none' }}>
                      Start Simplifying
                    </a>
                  </div>
                </div>

                {/* Floating 3D Decorative Cards (Acctual Style) */}
                <div className="floating-card float-1">
                  <div className="float-icon float-blue">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                  </div>
                  <span>S → aSb | ε</span>
                </div>
                
                <div className="floating-card float-2">
                  <div className="float-icon float-purple">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                  </div>
                  <span>Eliminate ∅</span>
                </div>
                
                <div className="floating-card float-3">
                  <span className="float-code">L(G) = &#123;aⁿbⁿ&#125;</span>
                </div>

                <div className="floating-card float-4">
                  <div className="float-icon float-green">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  </div>
                  <span>Valid String</span>
                </div>
              </section>
            )}

            {/* Theory section */}
            {!isLoading && (
              <section id="theory" style={{ marginBottom: '4rem' }}>
                <GrammarTheoryDashboard />
              </section>
            )}

            {/* Input section */}
            <section className="input-section" id="converter-section">
              <InputPanel onSubmit={handleSubmit} />
            </section>

            {/* Loading state */}
            {isLoading && (
              <section className="placeholder-section">
                <div className="placeholder-content">
                  <div className="placeholder-icon-group">
                    <div className="placeholder-icon placeholder-icon-1">ε</div>
                    <div className="placeholder-icon placeholder-icon-2">→</div>
                    <div className="placeholder-icon placeholder-icon-3">∅</div>
                  </div>
                  <h2 className="placeholder-title">Processing…</h2>
                  <p className="placeholder-desc">
                    Running the simplification pipeline on your grammar.
                  </p>
                </div>
              </section>
            )}

            {/* Results section */}
            {steps && !isLoading && (
              <section className="results-section" id="results">
                <StepNavigator
                  currentStep={currentStep}
                  totalSteps={4}
                  stepData={currentStepData}
                  onPrev={() => setCurrentStep((s) => Math.max(1, s - 1))}
                  onNext={() => setCurrentStep((s) => Math.min(4, s + 1))}
                />

                <div className="results-panels">
                  <div className="results-grammar-col">
                    <GrammarDisplay
                      stepResult={currentStepData}
                      previousGrammar={
                        previousStepData
                          ? previousStepData.grammar
                          : originalGrammar
                      }
                    />
                  </div>
                  <div className="results-graph-col" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <StepVisualizer
                      stepResult={currentStepData}
                      previousStepResult={previousStepData}
                      onNext={() => setCurrentStep(s => Math.min(4, s + 1))}
                      onPrev={() => setCurrentStep(s => Math.max(1, s - 1))}
                      hasNext={currentStep < 4}
                      hasPrev={currentStep > 1}
                    />
                    
                    {/* Transition / Next Step Button */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                      {currentStep < 4 ? (
                        <button 
                          className="btn-primary" 
                          onClick={() => setCurrentStep(s => Math.min(4, s + 1))}
                          type="button"
                        >
                          Next Step →
                        </button>
                      ) : (
                        <button 
                          className="btn-primary btn-simplify" 
                          onClick={() => {
                            const input = document.querySelector('.recognizer-input');
                            if (input) {
                              input.focus();
                              input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }}
                          type="button"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                          Check Language of Grammar
                        </button>
                      )}
                    </div>
                  </div>
                </div>


                {/* String Membership Checker */}
                <RecognizerPanel grammar={simplifiedGrammar} />
              </section>
            )}

            {/* Pre-result placeholder */}
            {!steps && !isLoading && (
              <section className="placeholder-section">
                <div className="placeholder-content">
                  <div className="placeholder-icon-group">
                    <div className="placeholder-icon placeholder-icon-1">ε</div>
                    <div className="placeholder-icon placeholder-icon-2">→</div>
                    <div className="placeholder-icon placeholder-icon-3">∅</div>
                  </div>
                  <h2 className="placeholder-title">Ready to Simplify</h2>
                  <p className="placeholder-desc">
                    Enter a context-free grammar above or load the example to see
                    the step-by-step simplification process with interactive
                    graph visualization.
                  </p>
                </div>
              </section>
            )}
          </>
        )}



        {/* ──────────────── EQUIVALENCE TAB ──────────────── */}
        {activeTab === 'equivalence' && (
          <section className="tab-content-section">
            <EquivalencePanel />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>
          CFG Simplifier — Built for learning formal language theory
        </p>
      </footer>
    </div>
  );
}
