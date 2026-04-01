import { eliminateNull } from './eliminateNull';
import { eliminateUnit } from './eliminateUnit';
import { eliminateUseless } from './eliminateUseless';
import { cleanupGrammar } from './cleanupGrammar';

/**
 * Run the full CFG simplification pipeline.
 * Returns a Promise that resolves to an array of StepResult objects (always 4 entries).
 * Wrapped in a Promise + setTimeout to avoid blocking the main thread.
 */
export function runPipeline(grammar) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const steps = [];

        // Step 1: Eliminate ε-productions
        const step1 = eliminateNull(grammar);
        steps.push({
          stepNumber: 1,
          title: 'Eliminate ε-Productions',
          description:
            step1.changes.length === 0
              ? 'No ε-productions found. Grammar unchanged at this step.'
              : `Identified nullable variables and removed ε-productions. Generated new productions by combining nullable symbol omissions.`,
          grammar: step1.grammar,
          changes: step1.changes,
          metadata: step1.metadata,
        });

        // Step 2: Eliminate unit productions
        const step2 = eliminateUnit(step1.grammar);
        steps.push({
          stepNumber: 2,
          title: 'Eliminate Unit Productions',
          description:
            step2.changes.length === 0
              ? 'No unit productions found. Grammar unchanged at this step.'
              : `Computed unit closures and replaced unit productions (A → B) with the non-unit productions of B.`,
          grammar: step2.grammar,
          changes: step2.changes,
          metadata: step2.metadata,
        });

        // Step 3: Eliminate useless symbols
        const step3 = eliminateUseless(step2.grammar);

        // Check for empty language
        const emptyLanguage = step3.grammar.productions.length === 0;

        steps.push({
          stepNumber: 3,
          title: 'Eliminate Useless Symbols',
          description: emptyLanguage
            ? '⚠ Grammar generates empty language. All symbols were found to be useless.'
            : step3.changes.length === 0
              ? 'No useless symbols found. Grammar unchanged at this step.'
              : `Removed non-generating and non-reachable symbols from the grammar.`,
          grammar: step3.grammar,
          changes: step3.changes,
          metadata: step3.metadata,
        });

        // Step 4: Cleanup & finalize
        const step4 = cleanupGrammar(step3.grammar);
        steps.push({
          stepNumber: 4,
          title: 'Final Cleanup',
          description:
            step4.metadata.duplicatesRemoved === 0
              ? 'Grammar is already clean. Sorted productions with start symbol first.'
              : `Removed ${step4.metadata.duplicatesRemoved} duplicate production(s) and sorted the final grammar.`,
          grammar: step4.grammar,
          changes: step4.changes,
          metadata: step4.metadata,
        });

        resolve(steps);
      } catch (err) {
        reject(err);
      }
    }, 0);
  });
}