import { useState } from 'react';
import { parseGrammar, validateGrammar } from '../logic/cfgParser';
import { checkEquivalence } from '../logic/equivalenceChecker';

export default function EquivalencePanel() {
  const [grammarA, setGrammarA] = useState({ start: '', rows: [{ lhs: '', rhs: '' }] });
  const [grammarB, setGrammarB] = useState({ start: '', rows: [{ lhs: '', rhs: '' }] });
  const [result, setResult] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [errors, setErrors] = useState([]);

  function updateRow(grammar, setGrammar, index, field, value) {
    const updated = { ...grammar, rows: [...grammar.rows] };
    updated.rows[index] = { ...updated.rows[index], [field]: value };
    setGrammar(updated);
  }

  function addRow(grammar, setGrammar) {
    setGrammar({ ...grammar, rows: [...grammar.rows, { lhs: '', rhs: '' }] });
  }

  function removeRow(grammar, setGrammar, index) {
    if (grammar.rows.length === 1) return;
    setGrammar({ ...grammar, rows: grammar.rows.filter((_, i) => i !== index) });
  }

  function handleCompare() {
    setResult(null);
    setErrors([]);

    // Validate both grammars
    const errsA = validateGrammar(grammarA.rows, grammarA.start);
    const errsB = validateGrammar(grammarB.rows, grammarB.start);
    const allErrs = [];
    if (errsA.length > 0) allErrs.push(...errsA.map((e) => `Grammar A: ${e}`));
    if (errsB.length > 0) allErrs.push(...errsB.map((e) => `Grammar B: ${e}`));

    if (allErrs.length > 0) {
      setErrors(allErrs);
      return;
    }

    setIsChecking(true);

    setTimeout(() => {
      try {
        const parsedA = parseGrammar(grammarA.rows, grammarA.start);
        const parsedB = parseGrammar(grammarB.rows, grammarB.start);
        const res = checkEquivalence(parsedA, parsedB);
        setResult(res);
      } catch (err) {
        setErrors([`Error: ${err.message}`]);
      }
      setIsChecking(false);
    }, 10);
  }

  function renderGrammarInput(label, grammar, setGrammar, id) {
    return (
      <div className="eq-grammar-input">
        <div className="eq-grammar-label">{label}</div>
        <div className="eq-start-row">
          <label className="input-label">Start Symbol</label>
          <input
            className="input-field input-field-start"
            type="text"
            maxLength={1}
            placeholder="S"
            value={grammar.start}
            onChange={(e) => setGrammar({ ...grammar, start: e.target.value.toUpperCase().slice(0, 1) })}
          />
        </div>
        <div className="eq-productions">
          {grammar.rows.map((row, index) => (
            <div key={index} className="input-production-row">
              <span className="input-row-number">{index + 1}</span>
              <input
                className="input-field input-field-lhs"
                type="text"
                placeholder="A"
                maxLength={1}
                value={row.lhs}
                onChange={(e) => updateRow(grammar, setGrammar, index, 'lhs', e.target.value.toUpperCase().slice(0, 1))}
              />
              <span className="input-arrow">→</span>
              <input
                className="input-field input-field-rhs"
                type="text"
                placeholder="a B | ε"
                value={row.rhs}
                onChange={(e) => updateRow(grammar, setGrammar, index, 'rhs', e.target.value)}
              />
              <button
                className="btn-icon btn-remove"
                onClick={() => removeRow(grammar, setGrammar, index)}
                disabled={grammar.rows.length === 1}
                title="Remove row"
                type="button"
              >×</button>
            </div>
          ))}
        </div>
        <button className="btn-add-row" onClick={() => addRow(grammar, setGrammar)} type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Production
        </button>
      </div>
    );
  }

  return (
    <div className="eq-panel">
      <div className="eq-header">
        <div className="eq-header-label">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <span>Grammar Equivalence Checker</span>
        </div>
        <p className="eq-subtitle">
          Enter two grammars below. We'll generate strings from each and cross-check membership to find counter-examples.
        </p>
      </div>

      <div className="eq-inputs">
        {renderGrammarInput('Grammar A', grammarA, setGrammarA, 'a')}
        <div className="eq-vs">VS</div>
        {renderGrammarInput('Grammar B', grammarB, setGrammarB, 'b')}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="input-errors">
          {errors.map((err, i) => (
            <div key={i} className="input-error-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {err}
            </div>
          ))}
        </div>
      )}

      {/* Compare button */}
      <button
        className="btn-primary btn-simplify"
        onClick={handleCompare}
        disabled={isChecking}
        type="button"
      >
        {isChecking ? (
          <>
            <span className="btn-spinner" />
            Comparing…
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
            Compare Grammars
          </>
        )}
      </button>

      {/* Result */}
      {result && (
        <div className={`eq-result ${result.equivalent ? 'eq-result-match' : 'eq-result-mismatch'}`}>
          <div className="eq-result-header">
            {result.equivalent ? (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <strong>Likely Equivalent ✓</strong>
              </>
            ) : (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <strong>NOT Equivalent ✗</strong>
              </>
            )}
          </div>

          <div className="eq-stats">
            Tested {result.stats.totalTested} strings
            ({result.stats.stringsFromA} from A, {result.stats.stringsFromB} from B)
          </div>

          {result.equivalent && (
            <p className="eq-caveat">
              ⚠ Note: This is a bounded test, not a mathematical proof. No counter-example was found among the tested strings.
            </p>
          )}

          {result.counterExamples.length > 0 && (
            <div className="eq-counterexamples">
              <div className="eq-counterexamples-label">Counter-examples found:</div>
              {result.counterExamples.map((ce, i) => (
                <div key={i} className="eq-counterexample-item">
                  <code>"{ce.string}"</code>
                  <span>
                    Accepted by <strong>{ce.acceptedBy}</strong>,
                    rejected by <strong>{ce.rejectedBy}</strong>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
