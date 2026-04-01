import { cloneGrammar, dedup, recomputeSets } from './cfgParser';

/**
 * Step 4: Final cleanup.
 *  - Deduplicate any remaining duplicate productions.
 *  - Group productions by LHS; sort with start symbol first, rest alphabetically.
 *  - Recalculate final variable/terminal sets via recomputeSets.
 *
 * FIX: replaced inline /^[A-Z]$/ variable-detection with recomputeSets()
 * from cfgParser so multi-char variable names are handled consistently.
 */
export function cleanupGrammar(grammar) {
  const g = cloneGrammar(grammar);

  // 1. Deduplicate
  const before = g.productions.length;
  const dedupedProductions = dedup(g.productions);
  const duplicatesRemoved = before - dedupedProductions.length;

  // 2. Group by LHS
  const grouped = {};
  for (const p of dedupedProductions) {
    if (!grouped[p.lhs]) grouped[p.lhs] = [];
    grouped[p.lhs].push(p);
  }

  // 3. Sort: start symbol first, then alphabetically
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (a === g.start) return -1;
    if (b === g.start) return 1;
    return a.localeCompare(b);
  });

  const sortedProductions = [];
  for (const key of sortedKeys) {
    for (const p of grouped[key]) {
      sortedProductions.push(p);
    }
  }

  // 4. Recalculate variable/terminal sets
  const { variables, terminals } = recomputeSets(sortedProductions, g.start);

  // Build change records
  const oldKeys = new Set(g.productions.map((p) => p.lhs + '→' + p.rhs.join(' ')));
  const newKeys = new Set(sortedProductions.map((p) => p.lhs + '→' + p.rhs.join(' ')));

  const changes = [];
  for (const p of sortedProductions) {
    const key = p.lhs + '→' + p.rhs.join(' ');
    if (!oldKeys.has(key)) changes.push({ type: 'added', production: p });
  }
  for (const p of g.productions) {
    const key = p.lhs + '→' + p.rhs.join(' ');
    if (!newKeys.has(key)) changes.push({ type: 'removed', production: p });
  }

  return {
    grammar: { variables, terminals, start: g.start, productions: sortedProductions },
    changes,
    metadata: { duplicatesRemoved, finalVariableCount: variables.size },
  };
}
