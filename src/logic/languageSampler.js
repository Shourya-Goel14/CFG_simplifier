/**
 * languageSampler.js — Generate sample terminal strings from a CFG.
 *
 * Uses BFS to find the N shortest strings in L(grammar).
 * Also provides a random derivation walk for the equivalence checker.
 */

const MAX_STATES = 30_000;

/**
 * Generate up to `maxStrings` of the shortest terminal strings from the grammar.
 *
 * @param {Object} grammar   — { variables, terminals, start, productions }
 * @param {number} maxStrings — how many strings to collect (default 15)
 * @param {number} maxLength  — max string length to explore (default 10)
 * @returns {string[]}
 */
export function sampleStrings(grammar, maxStrings = 15, maxLength = 10) {
  const { variables, start, productions } = grammar;

  // Index productions by LHS
  const prodsByLhs = {};
  for (const p of productions) {
    if (!prodsByLhs[p.lhs]) prodsByLhs[p.lhs] = [];
    prodsByLhs[p.lhs].push(p.rhs);
  }

  const results = [];
  const seenStrings = new Set();
  const queue = [[start]];
  const visited = new Set();
  visited.add(start);

  while (queue.length > 0 && results.length < maxStrings && visited.size < MAX_STATES) {
    const form = queue.shift();

    // Find leftmost variable
    let leftmostIdx = -1;
    for (let i = 0; i < form.length; i++) {
      if (variables.has(form[i])) {
        leftmostIdx = i;
        break;
      }
    }

    // All terminals
    if (leftmostIdx === -1) {
      const str = form.join('');
      if (!seenStrings.has(str)) {
        seenStrings.add(str);
        results.push(str || 'ε');
      }
      continue;
    }

    const varToExpand = form[leftmostIdx];
    const rhsList = prodsByLhs[varToExpand] || [];

    for (const rhs of rhsList) {
      const newForm = [
        ...form.slice(0, leftmostIdx),
        ...(rhs.length === 1 && rhs[0] === 'ε' ? [] : rhs),
        ...form.slice(leftmostIdx + 1),
      ];

      // Length pruning
      const terminalCount = newForm.filter((s) => !variables.has(s)).length;
      if (terminalCount > maxLength) continue;

      const key = newForm.join(' ');
      if (visited.has(key)) continue;
      visited.add(key);

      queue.push(newForm);
    }
  }

  return results;
}

/**
 * Generate strings via random derivation walks.
 * Used by the equivalence checker for broader coverage.
 *
 * @param {Object} grammar
 * @param {number} count — number of random strings to generate
 * @param {number} maxDepth — max derivation depth
 * @returns {string[]}
 */
export function randomSample(grammar, count = 200, maxDepth = 15) {
  const { variables, start, productions } = grammar;

  const prodsByLhs = {};
  for (const p of productions) {
    if (!prodsByLhs[p.lhs]) prodsByLhs[p.lhs] = [];
    prodsByLhs[p.lhs].push(p.rhs);
  }

  const results = new Set();

  for (let attempt = 0; attempt < count * 3 && results.size < count; attempt++) {
    let form = [start];
    let depth = 0;
    let stuck = false;

    while (depth < maxDepth) {
      // Find leftmost variable
      let leftmostIdx = -1;
      for (let i = 0; i < form.length; i++) {
        if (variables.has(form[i])) {
          leftmostIdx = i;
          break;
        }
      }

      if (leftmostIdx === -1) break; // all terminals

      const varToExpand = form[leftmostIdx];
      const rhsList = prodsByLhs[varToExpand];
      if (!rhsList || rhsList.length === 0) {
        stuck = true;
        break;
      }

      // Pick random production
      const rhs = rhsList[Math.floor(Math.random() * rhsList.length)];
      form = [
        ...form.slice(0, leftmostIdx),
        ...(rhs.length === 1 && rhs[0] === 'ε' ? [] : rhs),
        ...form.slice(leftmostIdx + 1),
      ];

      // Safety: if form gets too long, bail
      if (form.length > 30) {
        stuck = true;
        break;
      }

      depth++;
    }

    // Only add if fully terminal
    if (!stuck && !form.some((s) => variables.has(s))) {
      results.add(form.join('') || 'ε');
    }
  }

  return [...results];
}
