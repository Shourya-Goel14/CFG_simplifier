function dedup(productions) {
  const seen = new Set();
  const out = [];
  for (const p of productions) {
    const key = p.lhs + '→' + p.rhs.join(' ');
    if (!seen.has(key)) { seen.add(key); out.push(p); }
  }
  return out;
}

function cloneGrammar(g) {
  return {
    variables: new Set(g.variables),
    terminals: new Set(g.terminals),
    start: g.start,
    productions: g.productions.map(p => ({ lhs: p.lhs, rhs: [...p.rhs] })),
  };
}

function recalcSets(grammar) {
  const vars = new Set();
  const terms = new Set();
  for (const p of grammar.productions) {
    vars.add(p.lhs);
    for (const s of p.rhs) {
      if (s === 'ε') continue;
      if (/^[A-Z]$/.test(s)) vars.add(s); else terms.add(s);
    }
  }
  grammar.variables = vars;
  grammar.terminals = terms;
}

function eliminateNull(grammar) {
  const g = cloneGrammar(grammar);

  // --- 1. Compute nullable set ---
  const nullable = new Set();
  for (const p of g.productions) {
    if (p.rhs.length === 1 && p.rhs[0] === 'ε') {
      nullable.add(p.lhs);
    }
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of g.productions) {
      if (nullable.has(p.lhs)) continue;
      if (p.rhs.length > 0 && p.rhs.every((s) => nullable.has(s))) {
        nullable.add(p.lhs);
        changed = true;
      }
    }
  }

  // --- 2. Generate combinations (skip pure ε rules) ---
  const newProductions = [];
  for (const p of g.productions) {
    if (p.rhs.length === 1 && p.rhs[0] === 'ε') continue;

    const nullableIndices = [];
    p.rhs.forEach((s, i) => {
      if (nullable.has(s)) nullableIndices.push(i);
    });

    const n = nullableIndices.length;
    const totalCombos = 1 << n; // 2^n

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

  const dedupedProductions = dedup(newProductions);

  const resultGrammar = {
    variables: new Set(g.variables),
    terminals: new Set(g.terminals),
    start: g.start,
    productions: dedupedProductions,
  };

  recalcSets(resultGrammar);
  return { grammar: resultGrammar };
}

console.log("TEST 1: S -> A B, A -> a A | ε, B -> b B | ε");
const res1 = eliminateNull({
  variables: new Set(['S', 'A', 'B']), terminals: new Set(['a', 'b']), start: 'S',
  productions: [
    { lhs: 'S', rhs: ['A', 'B'] },
    { lhs: 'A', rhs: ['a', 'A'] }, { lhs: 'A', rhs: ['ε'] },
    { lhs: 'B', rhs: ['b', 'B'] }, { lhs: 'B', rhs: ['ε'] }
  ]
});
res1.grammar.productions.forEach(p => console.log('  ', p.lhs, '->', p.rhs.join(' ')));

console.log("\nTEST 2: S -> A, A -> A A | ε");
const res2 = eliminateNull({
  variables: new Set(['S', 'A']), terminals: new Set(), start: 'S',
  productions: [
    { lhs: 'S', rhs: ['A'] },
    { lhs: 'A', rhs: ['A', 'A'] }, { lhs: 'A', rhs: ['ε'] }
  ]
});
res2.grammar.productions.forEach(p => console.log('  ', p.lhs, '->', p.rhs.join(' ')));

console.log("\nTEST 3: S -> A, A -> ε");
const res3 = eliminateNull({
  variables: new Set(['S', 'A']), terminals: new Set(), start: 'S',
  productions: [
    { lhs: 'S', rhs: ['A'] },
    { lhs: 'A', rhs: ['ε'] }
  ]
});
res3.grammar.productions.forEach(p => console.log('  ', p.lhs, '->', p.rhs.join(' ')));
