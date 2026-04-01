import { useState, useCallback } from 'react';
import Header from './components/Header';
import InputPanel from './components/InputPanel';
import StepNavigator from './components/StepNavigator';
import GrammarDisplay from './components/GrammarDisplay';
import GraphPanel from './components/GraphPanel';
import { parseGrammar } from './logic/cfgParser';
import { runPipeline } from './logic/cfgPipeline';
import GrammarTheoryDashboard from './components/GrammarTheoryDashboard';

export default function App() {
  const [steps, setSteps] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [originalGrammar, setOriginalGrammar] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <div className="app">
      <Header />

      <main className="main-content">
        {/* Theory section */}
        {!steps && !isLoading && (
          <section style={{ marginBottom: '4rem' }}>
            <GrammarTheoryDashboard />
          </section>
        )}

        {/* Input section */}
        <section className="input-section">
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
              <div className="results-graph-col">
                <GraphPanel
                  stepResult={currentStepData}
                  previousStepResult={previousStepData}
                />
              </div>
            </div>
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
