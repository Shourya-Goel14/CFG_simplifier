/**
 * Step 3: Eliminate Useless Symbols
 */

import { cloneGrammar, dedup, recomputeSets } from './cfgParser';

/* ─────────────────────────────────────────────────────────────────
   INTERNAL HELPERS
───────────────────────────────────────────────────────────────── */

function canRhsBeConstructedFrom(rhs, lexicon) {
  if (rhs.length === 0) return true;
  return rhs.every((sym) => sym === 'ε' || lexicon.has(sym));
}

function isEpsilonRule(p) {
  return p.rhs.length === 1 && p.rhs[0] === 'ε';
}

function filterNonTerminals(symbols) {
  const seen = new Set();
  const out = [];
  for (const s of symbols) {
    if (/^[A-Z][A-Z0-9]*$/.test(s) && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

function filterTerminals(symbols) {
  const seen = new Set();
  const out = [];
  for (const s of symbols) {
    if (s !== 'ε' && !/^[A-Z][A-Z0-9]*$/.test(s) && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

function filterRules(productions, ntSet, tSet) {
  const lexicon = new Set([...ntSet, ...tSet]);
  return productions.filter(
    // BUG FIX 3: Parentheses added so LHS must always be in ntSet, even for epsilon rules.
    (p) => ntSet.has(p.lhs) && (canRhsBeConstructedFrom(p.rhs, lexicon) || isEpsilonRule(p))
  );
}

/* ─────────────────────────────────────────────────────────────────
   ALGORITHM 4.1 — Find generative (productive) non-terminals
───────────────────────────────────────────────────────────────── */

function expandGenerativeNonTerminals(productions, terminals, ni) {
  const lexicon = new Set([...ni, ...terminals]);
  const satisfiedRules = productions.filter(
    (p) => canRhsBeConstructedFrom(p.rhs, lexicon) || isEpsilonRule(p)
  );
  const expanded = new Set(ni);
  for (const p of satisfiedRules) expanded.add(p.lhs);
  return expanded;
}

function findGenerativeNonTerminals(productions, terminals) {
  let ni = new Set();
  const trace = [];
  let pass = 1;

  while (true) {
    const next = expandGenerativeNonTerminals(productions, terminals, ni);
    const added = [...next].filter(x => !ni.has(x));
    
    if (added.length > 0) {
      if (pass === 1) {
        trace.push(`Pass ${pass}: Added {${added.join(', ')}} because they derive strings of terminals.`);
      } else {
        trace.push(`Pass ${pass}: Added {${added.join(', ')}} because they derive strings of terminals and known generative symbols.`);
      }
    }

    if (setsEqual(ni, next)) return { set: ni, trace };
    ni = next;
    pass++;
  }
}

/* ─────────────────────────────────────────────────────────────────
   ALGORITHM 4.2 — Find reachable (available) symbols
───────────────────────────────────────────────────────────────── */

function expandAvailableSymbols(productions, vi) {
  const expanded = new Set(vi);
  for (const p of productions) {
    if (vi.has(p.lhs)) {
      for (const sym of p.rhs) {
        if (sym !== 'ε') expanded.add(sym);
      }
    }
  }
  return expanded;
}

function findAvailableSymbols(productions, startSymbol) {
  let vi = new Set([startSymbol]);
  const trace = [`Pass 0: Started with Start symbol {${startSymbol}}`];
  let pass = 1;

  while (true) {
    const next = expandAvailableSymbols(productions, vi);
    const added = [...next].filter(x => !vi.has(x));
    
    if (added.length > 0) {
      trace.push(`Pass ${pass}: Added {${added.join(', ')}} because they appear on the RHS of productions for reachable symbols.`);
    }

    if (setsEqual(vi, next)) return { set: vi, trace };
    vi = next;
    pass++;
  }
}

/* ─────────────────────────────────────────────────────────────────
   UTILITY
───────────────────────────────────────────────────────────────── */

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

/* ─────────────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────────────── */

export function eliminateUseless(grammar) {
  const g = cloneGrammar(grammar);

  /* ── PHASE A: Algorithm 4.1 ── */

  // BUG FIX 2: Build the complete terminal set *before* calling findGenerativeNonTerminals
  const allRhsSymbols = g.productions.flatMap((p) => p.rhs);
  const actualTerminals = new Set(filterTerminals([...g.terminals, ...allRhsSymbols]));

  const genResult = findGenerativeNonTerminals(g.productions, actualTerminals);
  const generativeNT = genResult.set;
  const generativeTrace = genResult.trace;

  // BUG FIX 1: Removed `generativeNT.add(g.start);` 
  // If the start symbol doesn't generate anything, the language is empty and S should be eliminated.

  const nonGenerating = new Set();
  for (const v of g.variables) {
    if (!generativeNT.has(v)) nonGenerating.add(v);
  }

  const ntAfterA = new Set(filterNonTerminals([...generativeNT]));
  const tAfterA = new Set(actualTerminals);

  const rulesAfterA = filterRules(g.productions, ntAfterA, tAfterA);

  /* ── PHASE B: Algorithm 4.2 ── */

  const availResult = findAvailableSymbols(rulesAfterA, g.start);
  const availableSymbols = availResult.set;
  const reachableTrace = availResult.trace;

  const ntAfterB = new Set(filterNonTerminals([...availableSymbols]));
  const tAfterB = new Set(filterTerminals([...availableSymbols]));

  const rulesAfterB = filterRules(rulesAfterA, ntAfterB, tAfterB);

  const nonReachable = new Set();
  for (const v of ntAfterA) {
    if (!ntAfterB.has(v)) nonReachable.add(v);
  }

  /* ── Build result ── */

  const dedupedProductions = dedup(rulesAfterB);

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

  const { variables, terminals } = recomputeSets(dedupedProductions, g.start);

  return {
    grammar: { variables, terminals, start: g.start, productions: dedupedProductions },
    changes,
    metadata: { nonGenerating, nonReachable, generativeTrace, reachableTrace },
  };
}