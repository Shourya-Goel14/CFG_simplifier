import { useState, useEffect } from 'react';
import { checkString } from '../logic/derivationParser';
import { sampleStrings } from '../logic/languageSampler';

export default function RecognizerPanel({ grammar }) {
  const [inputStr, setInputStr] = useState('');
  const [result, setResult] = useState(null); // { accepted, derivation }
  const [isChecking, setIsChecking] = useState(false);
  const [samples, setSamples] = useState(null);
  const [showSamples, setShowSamples] = useState(true);

  // Auto-generate samples when grammar changes
  useEffect(() => {
    if (grammar) {
      const s = sampleStrings(grammar, 15, 10);
      setSamples(s);
    }
  }, [grammar]);

  function handleCheck() {
    if (!grammar) return;
    setIsChecking(true);
    setResult(null);

    // Use setTimeout to avoid blocking UI
    setTimeout(() => {
      try {
        const res = checkString(grammar, inputStr);
        setResult(res);
      } catch (err) {
        setResult({ accepted: false, derivation: null, error: err.message });
      }
      setIsChecking(false);
    }, 10);
  }

  function handleShowSamples() {
    if (!grammar) return;
    if (!samples) {
      const s = sampleStrings(grammar, 15, 10);
      setSamples(s);
    }
    setShowSamples(!showSamples);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleCheck();
  }

  return (
    <div className="recognizer-panel">
      <div className="recognizer-header">
        <div className="recognizer-label">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>String Membership Checker</span>
        </div>
        <button
          className="btn-secondary btn-sm"
          onClick={handleShowSamples}
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          {showSamples ? 'Hide' : 'Show'} Sample Strings
        </button>
      </div>

      {/* Sample strings area */}
      {showSamples && samples && (
        <div className="recognizer-samples">
          <div className="recognizer-samples-label">
            Strings in L(G) — click to test:
          </div>
          <div className="recognizer-samples-list">
            {samples.length === 0 && (
              <span className="recognizer-sample-empty">No strings found (grammar may generate empty language)</span>
            )}
            {samples.map((s, i) => (
              <button
                key={i}
                className="recognizer-sample-chip"
                onClick={() => { setInputStr(s === 'ε' ? '' : s); setResult(null); }}
                type="button"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="recognizer-input-row">
        <input
          className="input-field recognizer-input"
          type="text"
          placeholder="Enter a string to check (leave empty for ε)..."
          value={inputStr}
          onChange={(e) => { setInputStr(e.target.value); setResult(null); }}
          onKeyDown={handleKeyDown}
        />
        <button
          className="btn-primary btn-check"
          onClick={handleCheck}
          disabled={isChecking || !grammar}
          type="button"
        >
          {isChecking ? (
            <>
              <span className="btn-spinner" />
              Checking…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Check
            </>
          )}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className={`recognizer-result ${result.accepted ? 'recognizer-accepted' : 'recognizer-rejected'}`}>
          <div className="recognizer-result-icon">
            {result.accepted ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            )}
          </div>
          <div className="recognizer-result-text">
            <strong>{result.accepted ? 'Accepted ✓' : 'Rejected ✗'}</strong>
            <span>
              The string <code>"{inputStr || 'ε'}"</code>{' '}
              {result.accepted
                ? 'belongs to the language of this grammar.'
                : 'is NOT generated by this grammar.'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
