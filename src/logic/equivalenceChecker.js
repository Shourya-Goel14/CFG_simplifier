/**
 * equivalenceChecker.js — Bounded grammar equivalence testing.
 *
 * Algorithm:
 *   1. Generate N random strings from Grammar A.
 *   2. Check each string against Grammar B using derivationParser.
 *   3. Repeat vice-versa (Grammar B strings → Grammar A).
 *   4. Report counter-examples if any string is accepted by one but rejected by the other.
 */

import { checkString } from './derivationParser.js';
import { randomSample, sampleStrings } from './languageSampler.js';

/**
 * @param {Object} grammarA — { variables, terminals, start, productions }
 * @param {Object} grammarB — same shape
 * @param {Object} options  — { sampleCount, maxLength }
 * @returns {{ equivalent: boolean, counterExamples: Array, stats: Object }}
 */
export function checkEquivalence(grammarA, grammarB, options = {}) {
  const { sampleCount = 150, maxLength = 10 } = options;

  const counterExamples = [];

  // Generate strings from both grammars using both BFS and random walks
  const bfsA = sampleStrings(grammarA, 30, maxLength);
  const bfsB = sampleStrings(grammarB, 30, maxLength);
  const randomA = randomSample(grammarA, sampleCount);
  const randomB = randomSample(grammarB, sampleCount);

  const stringsFromA = [...new Set([...bfsA, ...randomA])];
  const stringsFromB = [...new Set([...bfsB, ...randomB])];

  let testedCount = 0;

  // Test strings from A against B
  for (const str of stringsFromA) {
    const actual = str === 'ε' ? '' : str;
    const resultB = checkString(grammarB, actual);
    testedCount++;
    if (!resultB.accepted) {
      counterExamples.push({
        string: str,
        acceptedBy: 'Grammar A',
        rejectedBy: 'Grammar B',
      });
      if (counterExamples.length >= 5) break; // enough proof
    }
  }

  // Test strings from B against A
  if (counterExamples.length < 5) {
    for (const str of stringsFromB) {
      const actual = str === 'ε' ? '' : str;
      const resultA = checkString(grammarA, actual);
      testedCount++;
      if (!resultA.accepted) {
        counterExamples.push({
          string: str,
          acceptedBy: 'Grammar B',
          rejectedBy: 'Grammar A',
        });
        if (counterExamples.length >= 5) break;
      }
    }
  }

  return {
    equivalent: counterExamples.length === 0,
    counterExamples,
    stats: {
      stringsFromA: stringsFromA.length,
      stringsFromB: stringsFromB.length,
      totalTested: testedCount,
    },
  };
}
