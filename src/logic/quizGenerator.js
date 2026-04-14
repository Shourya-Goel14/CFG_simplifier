/**
 * quizGenerator.js — Generate quiz questions from a CFG.
 *
 * Question types:
 *   1. "Which variables are Nullable?"
 *   2. "Which variables are unreachable from the start symbol?"
 *   3. "Which of these are unit productions?"
 *   4. "Which variables are non-generating?"
 *   5. "What is the result of eliminating ε-productions?"
 */

/**
 * Generate a set of quiz questions for a given grammar.
 *
 * @param {Object} grammar — { variables, terminals, start, productions }
 * @returns {Array<{ id, type, question, options, correctAnswers, explanation }>}
 */
export function generateQuiz(grammar) {
  const { variables, terminals, start, productions } = grammar;
  const questions = [];

  // --- Q1: Nullable Variables ---
  const nullable = computeNullable(grammar);
  if (variables.size > 0) {
    questions.push({
      id: 'nullable',
      type: 'multi-select',
      question: 'Which of the following variables are Nullable?',
      hint: 'A variable is nullable if it can derive ε (empty string).',
      options: [...variables].sort(),
      correctAnswers: [...nullable].sort(),
      explanation: nullable.size > 0
        ? `Nullable variables: {${[...nullable].sort().join(', ')}}. A variable is nullable if it has a production A → ε, or all symbols in some production's RHS are nullable.`
        : 'No nullable variables exist in this grammar (no ε-productions).',
    });
  }

  // --- Q2: Unit Productions ---
  const unitProds = productions.filter(
    (p) => p.rhs.length === 1 && variables.has(p.rhs[0]) && p.rhs[0] !== 'ε'
  );
  if (productions.length > 1) {
    const prodStrings = productions.map((p) => `${p.lhs} → ${p.rhs.join(' ')}`);
    const unitProdStrings = unitProds.map((p) => `${p.lhs} → ${p.rhs.join(' ')}`);
    questions.push({
      id: 'unit-productions',
      type: 'multi-select',
      question: 'Which of the following are Unit Productions?',
      hint: 'A unit production has the form A → B where B is a single variable.',
      options: prodStrings,
      correctAnswers: unitProdStrings,
      explanation: unitProdStrings.length > 0
        ? `Unit productions: ${unitProdStrings.join(', ')}. These are productions where the RHS is a single non-terminal.`
        : 'This grammar has no unit productions.',
    });
  }

  // --- Q3: Non-Generating Variables ---
  const generating = computeGenerating(grammar);
  const nonGenerating = [...variables].filter((v) => !generating.has(v));
  if (variables.size > 1) {
    questions.push({
      id: 'non-generating',
      type: 'multi-select',
      question: 'Which variables are Non-Generating (cannot derive any terminal string)?',
      hint: 'A variable is generating if it can eventually produce a string of only terminals.',
      options: [...variables].sort(),
      correctAnswers: nonGenerating.sort(),
      explanation: nonGenerating.length > 0
        ? `Non-generating: {${nonGenerating.join(', ')}}. These variables can never produce a string of terminals.`
        : 'All variables in this grammar are generating.',
    });
  }

  // --- Q4: Unreachable Variables ---
  const reachable = computeReachable(grammar);
  const unreachable = [...variables].filter((v) => !reachable.has(v));
  if (variables.size > 1) {
    questions.push({
      id: 'unreachable',
      type: 'multi-select',
      question: `Which variables are Unreachable from the start symbol "${start}"?`,
      hint: 'A variable is reachable if it can appear in some derivation starting from S.',
      options: [...variables].sort(),
      correctAnswers: unreachable.sort(),
      explanation: unreachable.length > 0
        ? `Unreachable: {${unreachable.join(', ')}}. These variables never appear in any derivation from ${start}.`
        : `All variables are reachable from ${start}.`,
    });
  }

  // --- Q5: Identify Terminals ---
  if (terminals.size > 0 && variables.size > 0) {
    const allSymbols = [...new Set([...variables, ...terminals])].sort();
    questions.push({
      id: 'identify-terminals',
      type: 'multi-select',
      question: 'From the following symbols, select all Terminals.',
      hint: 'Terminals are the basic alphabet symbols (usually lowercase). Variables (non-terminals) are usually uppercase.',
      options: allSymbols,
      correctAnswers: [...terminals].sort(),
      explanation: `Terminals: {${[...terminals].sort().join(', ')}}. Variables: {${[...variables].sort().join(', ')}}.`,
    });
  }

  return questions;
}


// ── Helpers (reuse the same algorithms from the pipeline, but standalone) ──

function computeNullable(grammar) {
  const { productions } = grammar;
  const nullable = new Set();

  for (const p of productions) {
    if (p.rhs.length === 1 && p.rhs[0] === 'ε') {
      nullable.add(p.lhs);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const p of productions) {
      if (nullable.has(p.lhs)) continue;
      if (p.rhs.length > 0 && p.rhs.every((s) => nullable.has(s))) {
        nullable.add(p.lhs);
        changed = true;
      }
    }
  }

  return nullable;
}

function computeGenerating(grammar) {
  const { terminals, productions } = grammar;
  const generating = new Set();

  let changed = true;
  while (changed) {
    changed = false;
    for (const p of productions) {
      if (generating.has(p.lhs)) continue;
      const allGenerable = p.rhs.every(
        (s) => s === 'ε' || terminals.has(s) || generating.has(s)
      );
      if (allGenerable) {
        generating.add(p.lhs);
        changed = true;
      }
    }
  }

  return generating;
}

function computeReachable(grammar) {
  const { start, productions } = grammar;
  const reachable = new Set([start]);

  let changed = true;
  while (changed) {
    changed = false;
    for (const p of productions) {
      if (!reachable.has(p.lhs)) continue;
      for (const s of p.rhs) {
        if (s !== 'ε' && !reachable.has(s)) {
          reachable.add(s);
          changed = true;
        }
      }
    }
  }

  return reachable;
}
