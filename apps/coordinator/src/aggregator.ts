import type { Verdict } from '@codera/types';
import { mapJudge0StatusToVerdict } from '@codera/types';

interface TestcaseResult {
  testcaseIndex: number;
  status: string;
  verdict: Verdict;
  time?: string | null;
  memory?: string | null;
}

interface AggregationState {
  total: number;
  received: number;
  results: TestcaseResult[];
}

/**
 * In-memory aggregation of per-testcase results.
 * Each submission has an entry tracking total expected, received count, and results.
 */
const aggregations = new Map<string, AggregationState>();

export const aggregator = {
  /**
   * Register a submission for aggregation once we know total testcase count.
   */
  register(submissionId: string, totalTests: number): void {
    aggregations.set(submissionId, {
      total: totalTests,
      received: 0,
      results: [],
    });
    console.log(`[Aggregator] Registered ${submissionId} with ${totalTests} testcases`);
  },

  /**
   * Record a testcase result. Returns true if this was the last testcase.
   */
  recordResult(submissionId: string, result: TestcaseResult): boolean {
    const state = aggregations.get(submissionId);
    if (!state) {
      console.warn(`[Aggregator] No aggregation state for ${submissionId}`);
      return false;
    }

    state.received++;
    state.results.push(result);

    console.log(
      `[Aggregator] ${submissionId}: ${state.received}/${state.total} — testcase ${result.testcaseIndex} = ${result.verdict}`
    );

    return state.received >= state.total;
  },

  /**
   * Compute the final verdict after all testcases are received.
   *
   * Priority: CE > RTE > TLE > MLE > WA > AC
   */
  computeFinalVerdict(submissionId: string): {
    verdict: Verdict;
    passedTests: number;
    totalTests: number;
    results: TestcaseResult[];
  } {
    const state = aggregations.get(submissionId);
    if (!state) {
      return { verdict: 'INTERNAL_ERROR', passedTests: 0, totalTests: 0, results: [] };
    }

    // Sort results by testcase index
    const sorted = [...state.results].sort(
      (a, b) => a.testcaseIndex - b.testcaseIndex
    );

    const passedTests = sorted.filter((r) => r.verdict === 'AC').length;

    // Determine final verdict: first non-AC result wins (Codeforces style)
    let finalVerdict: Verdict = 'AC';
    for (const r of sorted) {
      if (r.verdict !== 'AC') {
        finalVerdict = r.verdict;
        break;
      }
    }

    // Clean up
    aggregations.delete(submissionId);

    return {
      verdict: finalVerdict,
      passedTests,
      totalTests: state.total,
      results: sorted,
    };
  },

  /** Check if submission is being tracked */
  has(submissionId: string): boolean {
    return aggregations.has(submissionId);
  },
};

export { mapJudge0StatusToVerdict };
export default aggregator;
