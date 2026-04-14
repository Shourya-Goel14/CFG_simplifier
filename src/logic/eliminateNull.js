import { cloneGrammar, dedup, recomputeSets } from './cfgParser.js';

/**
 * Step 1: Eliminate ε-productions.
 *
 * 1. Compute nullable set iteratively.
 * 2. For every production, generate all 2^n combinations by optionally
 *    omitting each nullable symbol (n = count of nullable symbols in RHS).
 * 3. Drop empty-RHS combos; skip original A → ε rules.
 * 4. Re-add S → ε only if the start symbol was nullable.
 * 5. Deduplicate.
 *
 * FIX: Recompute variables/terminals from surviving productions instead of
 * carrying forward stale sets. Without this, variables whose only production
 * was A→ε (now removed) remain in g.variables, causing eliminateUnit (Step 2)
 * to misclassify productions like S→B as unit productions when B is still
 * in the stale variable set.
 */
export function eliminateNull(grammar) {
  const g = cloneGrammar(grammar);

  // --- 1. Compute nullable set ---
  const nullable = new Set();
  const nullableTrace = [];

  for (const p of g.productions) {
    if (p.rhs.length === 1 && p.rhs[0] === 'ε') {
      nullable.add(p.lhs);
      if (!nullableTrace.some(t => t.var === p.lhs)) {
        nullableTrace.push({ var: p.lhs, reason: `Directly derives ε (${p.lhs} → ε)` });
      }
    }
  }

  let changed = true;
  let pass = 1;
  while (changed) {
    changed = false;
    for (const p of g.productions) {
      if (nullable.has(p.lhs)) continue;
      if (p.rhs.length > 0 && p.rhs.every((s) => nullable.has(s))) {
        nullable.add(p.lhs);
        nullableTrace.push({ var: p.lhs, reason: `Derives only Nullable variables (${p.lhs} → ${p.rhs.join(' ')})` });
        changed = true;
      }
    }
    pass++;
  }

  // --- 2. Generate combinations ---
  const newProductions = [];

  for (const p of g.productions) {
    if (p.rhs.length === 1 && p.rhs[0] === 'ε') continue;

    const nullableIndices = [];
    p.rhs.forEach((s, i) => {
      if (nullable.has(s)) nullableIndices.push(i);
    });

    const n = nullableIndices.length;
    const totalCombos = 1 << n;

    for (let mask = 0; mask < totalCombos; mask++) {
      const omitted = new Set();
      for (let bit = 0; bit < n; bit++) {
        if (mask & (1 << bit)) omitted.add(nullableIndices[bit]);
      }
      const newRhs = p.rhs.filter((_, i) => !omitted.has(i));
      if (newRhs.length > 0) {
        newProductions.push({ lhs: p.lhs, rhs: newRhs });
      }
    }
  }

  // --- 3. Keep S → ε if start symbol is nullable ---
  if (nullable.has(g.start)) {
    newProductions.push({ lhs: g.start, rhs: ['ε'] });
  }

  // --- 4. Deduplicate ---
  const dedupedProductions = dedup(newProductions);

  // Build change records
  const oldKeys = new Set(g.productions.map((p) => p.lhs + '→' + p.rhs.join(' ')));
  const newKeys = new Set(dedupedProductions.map((p) => p.lhs + '→' + p.rhs.join(' ')));

  const changes = [];
  for (const p of dedupedProductions) {
    const key = p.lhs + '→' + p.rhs.join(' ');
    if (!oldKeys.has(key)) changes.push({ type: 'added', production: p });
  }
  for (const p of g.productions) {
    const key = p.lhs + '→' + p.rhs.join(' ');
    if (!newKeys.has(key)) changes.push({ type: 'removed', production: p });
  }

  // FIX: recomputeSets so stale variables (e.g. A after A→ε removed) are gone.
  let { variables, terminals } = recomputeSets(dedupedProductions, g.start);

  // Additional FIX: after ε-elimination a variable can become a "ghost" — it
  // still appears on the RHS of some production (so recomputeSets adds it to
  // variables) but has zero LHS productions of its own. Example: S→A, A→ε
  // yields S→A and S→ε. A is in the RHS of S→A but has no rules left.
  // Remove these ghost variables so downstream steps don't misclassify them.
  const lhsVars = new Set(dedupedProductions.map((p) => p.lhs));
  for (const v of [...variables]) {
    if (v !== g.start && !lhsVars.has(v)) variables.delete(v);
  }

  return {
    grammar: { variables, terminals, start: g.start, productions: dedupedProductions },
    changes,
    metadata: { nullableSet: nullable, nullableTrace },
  };
}