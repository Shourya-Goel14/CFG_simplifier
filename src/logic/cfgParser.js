/**
 * CFG Parser — converts user input into a Grammar object.
 *
 * Production:  { lhs: string, rhs: string[] }
 * Grammar:     { variables: Set, terminals: Set, start: string, productions: Production[] }
 */

/**
 * Parse an array of { lhs, rhs } row objects (from the InputPanel) into a Grammar.
 * rhs is a pipe-separated string; 'eps' and 'ε' both map to epsilon.
 */
export function parseGrammar(rows, startSymbol) {
  const productions = [];
  const variables = new Set();
  const terminals = new Set();

  // First pass: collect all declared LHS variables
  const declaredVars = new Set();
  for (const row of rows) {
    const lhs = row.lhs.trim().toUpperCase();
    if (lhs) declaredVars.add(lhs);
  }

  for (const row of rows) {
    const lhs = row.lhs.trim().toUpperCase();
    if (!lhs) continue;
    variables.add(lhs);

    const rhsAlts = row.rhs
      .trim()
      .split(/\s*\|\s*/)
      .filter(Boolean);

    for (const alt of rhsAlts) {
      const rawTokens = alt.trim().split(/\s+/);

      // Resolve each token: split undeclared mixed strings into symbols
      let symbols = rawTokens.flatMap((t) => resolveToken(t, declaredVars));

      // Normalize epsilon
      symbols = symbols.map((s) => (s === 'eps' ? 'ε' : s));

      // If mix of ε and real symbols, drop the ε
      if (symbols.length > 1) {
        symbols = symbols.filter((s) => s !== 'ε');
        if (symbols.length === 0) symbols = ['ε'];
      }

      productions.push({ lhs, rhs: symbols });
    }
  }

  // Second pass: classify all RHS symbols as variables or terminals
  for (const p of productions) {
    for (const sym of p.rhs) {
      if (sym === 'ε') continue;
      if (variables.has(sym)) continue;
      if (declaredVars.has(sym) || /^[A-Z][A-Z0-9]*$/.test(sym)) {
        variables.add(sym);
      } else {
        terminals.add(sym);
      }
    }
  }

  return {
    variables: new Set(variables),
    terminals: new Set(terminals),
    start: startSymbol.trim().toUpperCase(),
    productions: dedup(productions),
  };
}

/**
 * Resolve a single whitespace-split token into one or more symbols.
 *
 * Rules:
 * - 'eps' or 'ε'          → ['ε']
 * - declared variable     → [token]  (e.g. 'S1', 'AB' if AB is explicitly on LHS)
 * - mixed strings         → smart split based on CFG conventions
 * e.g. 'aA' -> ['a', 'A']
 * e.g. 'idS1' -> ['id', 'S1']
 * e.g. 'AB' -> ['A', 'B']
 */
function resolveToken(token, declaredVars) {
  if (token === 'eps' || token === 'ε') return ['ε'];

  // If the entire token is explicitly declared on the LHS, keep it as one symbol
  if (declaredVars.has(token)) return [token];

  // Smart Split: 
  // 1. Matches an uppercase letter optionally followed by numbers (Variables: 'A', 'S1')
  // 2. Matches any consecutive non-uppercase, non-whitespace characters (Terminals: 'a', 'id', '+')
  const tokens = token.match(/([A-Z][0-9]*|[^A-Z\s]+)/g);

  return tokens || [token];
}

/** Deduplicate productions by (lhs, rhs-joined) */
export function dedup(productions) {
  const seen = new Set();
  const out = [];
  for (const p of productions) {
    const key = p.lhs + '→' + p.rhs.join(' ');
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

/** Clone a Grammar deeply */
export function cloneGrammar(g) {
  return {
    variables: new Set(g.variables),
    terminals: new Set(g.terminals),
    start: g.start,
    productions: g.productions.map((p) => ({ lhs: p.lhs, rhs: [...p.rhs] })),
  };
}

/**
 * Recompute variables and terminals purely from the actual productions.
 */
export function recomputeSets(productions, start) {
  const variables = new Set([start]);
  const terminals = new Set();
  for (const p of productions) {
    variables.add(p.lhs);
    for (const s of p.rhs) {
      if (s === 'ε') continue;
      // Follows standard variable naming (A, S1) for accurate recomputation
      if (/^[A-Z][A-Z0-9]*$/.test(s)) variables.add(s);
      else terminals.add(s);
    }
  }
  return { variables, terminals };
}

/** Validate grammar, returns array of error strings (empty = valid) */
export function validateGrammar(rows, startSymbol) {
  const errors = [];
  const s = startSymbol.trim().toUpperCase();

  if (!s) {
    errors.push('Start symbol is required');
    return errors;
  }

  if (rows.length === 0 || rows.every((r) => !r.lhs.trim() && !r.rhs.trim())) {
    errors.push('Grammar must have at least one production');
    return errors;
  }

  const declaredVars = new Set();
  rows.forEach((r) => {
    const l = r.lhs.trim().toUpperCase();
    if (l) declaredVars.add(l);
  });

  if (!declaredVars.has(s)) {
    errors.push('Start symbol must be declared as a variable');
  }

  rows.forEach((r, i) => {
    const l = r.lhs.trim();
    const rr = r.rhs.trim();
    if (!l && !rr) return;
    if (!l || !rr) {
      errors.push(`Row ${i + 1} has an empty LHS or RHS`);
    }
  });

  return errors;
}

/** Pretty-print a grammar as grouped lines: S → aB | cD */
export function grammarToString(grammar) {
  const grouped = {};
  for (const p of grammar.productions) {
    if (!grouped[p.lhs]) grouped[p.lhs] = [];
    grouped[p.lhs].push(p.rhs.join(' '));
  }
  const lines = [];
  if (grouped[grammar.start]) {
    lines.push(`${grammar.start} → ${grouped[grammar.start].join(' | ')}`);
  }
  const sorted = Object.keys(grouped)
    .filter((v) => v !== grammar.start)
    .sort();
  for (const v of sorted) {
    lines.push(`${v} → ${grouped[v].join(' | ')}`);
  }
  return lines.join('\n');
}