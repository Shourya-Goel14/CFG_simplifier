import { cloneGrammar, dedup, recomputeSets } from './cfgParser';

/**
 * Step 2: Eliminate unit productions (A → B where B is a single variable).
 *
 * Algorithm:
 * 1. For each variable A, compute its unit-closure via BFS:
 *    unit-closure(A) = { B | A ⟹* B using only unit productions }
 * 2. For every pair (A, B) in A's closure (B ≠ A):
 *    copy every non-unit production of B to A.
 * 3. Keep all non-unit productions of every variable.
 * 4. Drop all unit productions.
 * 5. Deduplicate.
 *
 * FIX: Recompute variables/terminals from surviving productions at the end.
 * This ensures Step 3 receives an accurate symbol set.
 */
export function eliminateUnit(grammar) {
  const g = cloneGrammar(grammar);

  // isUnit: RHS is exactly one symbol AND that symbol is a known variable.
  // Because Step 1 now recomputes sets correctly, g.variables no longer
  // contains stale entries like A (whose only rule A→ε was removed), so
  // S→B is only treated as a unit production if B is truly still a variable.
  const isUnit = (p) =>
    p.rhs.length === 1 && g.variables.has(p.rhs[0]) && p.rhs[0] !== 'ε';

  // 1. Compute unit closure for every variable via BFS
  const unitClosure = {};
  const unitPairs = [];
  const unitTrace = [];

  for (const A of g.variables) {
    const visited = new Set([A]);
    const queue = [A];

    while (queue.length > 0) {
      const curr = queue.shift();
      for (const p of g.productions) {
        if (p.lhs !== curr || !isUnit(p)) continue;
        const B = p.rhs[0];
        if (!visited.has(B)) {
          visited.add(B);
          queue.push(B);
          unitPairs.push([A, B]);
          if (curr === A) {
            unitTrace.push({ from: A, to: B, reason: `Direct unit production (${A} → ${B})` });
          } else {
            unitTrace.push({ from: A, to: B, reason: `Indirect path (${A} ⟹* ${curr} and ${curr} → ${B})` });
          }
        }
      }
    }

    unitClosure[A] = visited;
  }

  // 2 & 3. Build new production list
  const newProductions = [];

  for (const p of g.productions) {
    if (!isUnit(p)) {
      newProductions.push({ lhs: p.lhs, rhs: [...p.rhs] });
    }
  }

  for (const A of g.variables) {
    for (const B of unitClosure[A]) {
      if (A === B) continue;
      for (const p of g.productions) {
        if (p.lhs === B && !isUnit(p)) {
          newProductions.push({ lhs: A, rhs: [...p.rhs] });
        }
      }
    }
  }

  // 4-5. Deduplicate
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

  // FIX: recompute sets from actual surviving productions.
  const { variables, terminals } = recomputeSets(dedupedProductions, g.start);

  return {
    grammar: { variables, terminals, start: g.start, productions: dedupedProductions },
    changes,
    metadata: { unitPairs, unitTrace },
  };
}
