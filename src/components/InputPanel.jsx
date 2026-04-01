import { useState } from 'react';

const EXAMPLE_GRAMMAR = {
  start: 'S',
  rows: [
    { lhs: 'S', rhs: 'A B | B C' },
    { lhs: 'A', rhs: 'a A | ε' },
    { lhs: 'B', rhs: 'b B | A' },
    { lhs: 'C', rhs: 'c C | a' },
    { lhs: 'D', rhs: 'd D | e' },
  ],
};

export default function InputPanel({ onSubmit }) {
  const [startSymbol, setStartSymbol] = useState('');
  const [rows, setRows] = useState([{ lhs: '', rhs: '' }]);
  const [errors, setErrors] = useState([]);

  function addRow() {
    setRows([...rows, { lhs: '', rhs: '' }]);
  }

  function removeRow(index) {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== index));
  }

  function updateRow(index, field, value) {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  }

  function loadExample() {
    setStartSymbol(EXAMPLE_GRAMMAR.start);
    setRows(EXAMPLE_GRAMMAR.rows.map((r) => ({ ...r })));
    setErrors([]);
  }

  function clearAll() {
    setStartSymbol('');
    setRows([{ lhs: '', rhs: '' }]);
    setErrors([]);
  }

  function handleSubmit() {
    // Validate
    const errs = [];
    const s = startSymbol.trim().toUpperCase();
    if (!s) {
      errs.push('Start symbol is required');
    }

    const nonEmptyRows = rows.filter(
      (r) => r.lhs.trim() || r.rhs.trim()
    );
    if (nonEmptyRows.length === 0) {
      errs.push('Grammar must have at least one production');
    }

    const declaredVars = new Set();
    rows.forEach((r) => {
      const l = r.lhs.trim().toUpperCase();
      if (l) declaredVars.add(l);
    });

    if (s && !declaredVars.has(s) && nonEmptyRows.length > 0) {
      errs.push('Start symbol must be declared as a variable');
    }

    rows.forEach((r, i) => {
      const l = r.lhs.trim();
      const rr = r.rhs.trim();
      if (!l && !rr) return;
      if (!l || !rr) {
        errs.push(`Row ${i + 1} has an empty LHS or RHS`);
      }
    });

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    setErrors([]);
    onSubmit({ startSymbol: s, rows: nonEmptyRows });
  }

  return (
    <div className="input-panel">
      {/* Header bar */}
      <div className="input-panel-header">
        <div className="input-panel-label">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          <span>Grammar Input</span>
        </div>
        <div className="input-panel-actions">
          <button
            className="btn-secondary"
            onClick={loadExample}
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Load Example
          </button>
          <button
            className="btn-ghost"
            onClick={clearAll}
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Clear All
          </button>
        </div>
      </div>

      {/* Start Symbol Input */}
      <div className="input-start-row">
        <label className="input-label" htmlFor="start-symbol">Start Symbol</label>
        <input
          id="start-symbol"
          className="input-field input-field-start"
          type="text"
          maxLength={1}
          placeholder="S"
          value={startSymbol}
          onChange={(e) =>
            setStartSymbol(e.target.value.toUpperCase().slice(0, 1))
          }
        />
      </div>

      {/* Production rows */}
      <div className="input-productions">
        <label className="input-label">Productions</label>
        {rows.map((row, index) => (
          <div key={index} className="input-production-row">
            <span className="input-row-number">{index + 1}</span>
            <input
              className="input-field input-field-lhs"
              type="text"
              placeholder="A"
              maxLength={1}
              value={row.lhs}
              onChange={(e) =>
                updateRow(index, 'lhs', e.target.value.toUpperCase().slice(0, 1))
              }
            />
            <span className="input-arrow">→</span>
            <input
              className="input-field input-field-rhs"
              type="text"
              placeholder="a B | ε (or eps)"
              value={row.rhs}
              onChange={(e) => updateRow(index, 'rhs', e.target.value)}
            />
            <button
              className="btn-icon btn-remove"
              onClick={() => removeRow(index)}
              disabled={rows.length === 1}
              title="Remove row"
              type="button"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Add row button */}
      <button className="btn-add-row" onClick={addRow} type="button">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add Production
      </button>

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

      {/* Submit */}
      <button className="btn-primary btn-simplify" onClick={handleSubmit} type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        Simplify Grammar
      </button>
    </div>
  );
}
