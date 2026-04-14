/**
 * grammarLibrary.js — Curated educational grammar presets.
 *
 * Each entry has:
 *   - name: Display name
 *   - description: What language it generates
 *   - start: Start symbol
 *   - rows: Array of { lhs, rhs } suitable for InputPanel
 */

const GRAMMAR_LIBRARY = [
  {
    name: 'Balanced Parentheses',
    description: 'L = { (ⁿ)ⁿ | n ≥ 0 } — Matched parentheses',
    start: 'S',
    rows: [
      { lhs: 'S', rhs: '( S ) S | ε' },
    ],
  },
  {
    name: 'aⁿbⁿ',
    description: 'L = { aⁿbⁿ | n ≥ 1 } — Equal a\'s followed by b\'s',
    start: 'S',
    rows: [
      { lhs: 'S', rhs: 'a S b | a b' },
    ],
  },
  {
    name: 'Palindromes (a, b)',
    description: 'L = { w ∈ {a,b}* | w = wᴿ } — All palindromes',
    start: 'S',
    rows: [
      { lhs: 'S', rhs: 'a S a | b S b | a | b | ε' },
    ],
  },
  {
    name: 'Simple Arithmetic',
    description: 'Arithmetic expressions with +, *, (, ) over id',
    start: 'E',
    rows: [
      { lhs: 'E', rhs: 'E + T | T' },
      { lhs: 'T', rhs: 'T * F | F' },
      { lhs: 'F', rhs: '( E ) | id' },
    ],
  },
  {
    name: 'With Useless Symbols',
    description: 'Grammar with unreachable variable D — good for testing simplification',
    start: 'S',
    rows: [
      { lhs: 'S', rhs: 'A B | B C' },
      { lhs: 'A', rhs: 'a A | ε' },
      { lhs: 'B', rhs: 'b B | A' },
      { lhs: 'C', rhs: 'c C | a' },
      { lhs: 'D', rhs: 'd D | e' },
    ],
  },
  {
    name: 'Unit Production Chain',
    description: 'Grammar with unit productions A→B→C — demonstrates unit elimination',
    start: 'S',
    rows: [
      { lhs: 'S', rhs: 'A' },
      { lhs: 'A', rhs: 'B' },
      { lhs: 'B', rhs: 'C | b' },
      { lhs: 'C', rhs: 'a | c S' },
    ],
  },
  {
    name: 'aⁿbⁿcᵏ',
    description: 'L = { aⁿbⁿcᵏ | n ≥ 1, k ≥ 0 }',
    start: 'S',
    rows: [
      { lhs: 'S', rhs: 'A C' },
      { lhs: 'A', rhs: 'a A b | a b' },
      { lhs: 'C', rhs: 'c C | ε' },
    ],
  },
  {
    name: 'Boolean Expressions',
    description: 'Boolean logic with AND, OR, NOT over variables p, q',
    start: 'E',
    rows: [
      { lhs: 'E', rhs: 'E or T | T' },
      { lhs: 'T', rhs: 'T and F | F' },
      { lhs: 'F', rhs: 'not F | ( E ) | p | q' },
    ],
  },
];

export default GRAMMAR_LIBRARY;
