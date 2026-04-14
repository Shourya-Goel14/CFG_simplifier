/**
 * derivationParser.js — BFS-based string membership checker for any CFG.
 *
 * No CNF conversion needed. Works directly on the grammar's productions.
 *
 * Algorithm:
 *   1. Start with the sentential form [startSymbol].
 *   2. BFS: expand the leftmost variable using every applicable production.
 *   3. Prune branches whose terminal prefix already mismatches the target,
 *      or whose length exceeds the target (unless ε-productions exist).
 *   4. If we reach a sentential form that equals the target string → accepted.
 *   5. If the queue is exhausted → rejected.
 *
 * A hard cap on visited states prevents infinite loops on ambiguous / recursive grammars.
 */

const MAX_STATES = 50_000; // safety cap

/**
 * Check whether `inputString` ∈ L(grammar).
 *
 * @param {Object}  grammar      — { variables, terminals, start, productions }
 * @param {string}  inputString  — e.g. "aabb"
 * @returns {{ accepted: boolean, derivation: string[]|null }}
 */
export function checkString(grammar, inputString) {
  const { variables, start, productions } = grammar;
  const target = inputString.split('');

  // Special case: empty string
  if (target.length === 0) {
    // Check if start symbol can derive ε
    const canDeriveEps = productions.some(
      (p) => p.lhs === start && p.rhs.length === 1 && p.rhs[0] === 'ε'
    );
    return {
      accepted: canDeriveEps,
      derivation: canDeriveEps ? [start, 'ε'] : null,
    };
  }

  // Index productions by LHS for fast lookup
  const prodsByLhs = {};
  for (const p of productions) {
    if (!prodsByLhs[p.lhs]) prodsByLhs[p.lhs] = [];
    prodsByLhs[p.lhs].push(p.rhs);
  }

  // BFS state: array of symbols (mix of variables and terminals)
  const startState = [start];
  const queue = [{ form: startState, path: [start] }];
  const visited = new Set();
  visited.add(start);

  while (queue.length > 0 && visited.size < MAX_STATES) {
    const { form, path } = queue.shift();

    // Find leftmost variable
    let leftmostIdx = -1;
    for (let i = 0; i < form.length; i++) {
      if (variables.has(form[i])) {
        leftmostIdx = i;
        break;
      }
    }

    // No variable left → it's all terminals
    if (leftmostIdx === -1) {
      const derived = form.join('');
      if (derived === inputString) {
        return { accepted: true, derivation: path };
      }
      continue; // dead end, wrong string
    }

    const varToExpand = form[leftmostIdx];
    const rhsList = prodsByLhs[varToExpand] || [];

    for (const rhs of rhsList) {
      // Build new sentential form
      const newForm = [
        ...form.slice(0, leftmostIdx),
        ...(rhs.length === 1 && rhs[0] === 'ε' ? [] : rhs),
        ...form.slice(leftmostIdx + 1),
      ];

      // --- Pruning ---
      // Count terminals already fixed on the left
      const terminalCount = newForm.filter((s) => !variables.has(s)).length;
      if (terminalCount > target.length) continue; // too long already

      // Check if terminal prefix matches
      let prefixOk = true;
      for (let i = 0; i < newForm.length; i++) {
        if (variables.has(newForm[i])) break; // stop at first variable
        if (i >= target.length || newForm[i] !== target[i]) {
          prefixOk = false;
          break;
        }
      }
      if (!prefixOk) continue;

      const key = newForm.join(' ');
      if (visited.has(key)) continue;
      visited.add(key);

      const newPath = [...path, newForm.join('')];

      // If fully terminal, check match immediately
      if (!newForm.some((s) => variables.has(s))) {
        if (newForm.join('') === inputString) {
          return { accepted: true, derivation: newPath };
        }
        continue;
      }

      queue.push({ form: newForm, path: newPath });
    }
  }

  return { accepted: false, derivation: null };
}
