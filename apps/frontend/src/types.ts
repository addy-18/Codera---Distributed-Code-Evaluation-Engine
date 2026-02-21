// Copied/adapted from @codera/types
export type SubmissionStatus = 'queued' | 'running' | 'finished';

export type Verdict =
  | 'AC'    // Accepted
  | 'WA'    // Wrong Answer
  | 'TLE'   // Time Limit Exceeded
  | 'MLE'   // Memory Limit Exceeded
  | 'RTE'   // Runtime Error
  | 'CE'    // Compilation Error
  | 'INTERNAL_ERROR'
  | 'PENDING';

export interface Problem {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  constraints: string[];
  sampleTestCases: Array<{ input: string; expectedOutput: string }>;
  halfBoilerplate: Record<string, string>;
  createdAt: string;
}

export interface TestResultEvent {
  type: 'test_result';
  submissionId: string;
  testcaseIndex: number;
  verdict: Verdict;
  time?: string | null;
  memory?: string | null;
}

export interface FinalVerdictEvent {
  type: 'final_verdict';
  submissionId: string;
  verdict: Verdict;
  passedTests: number;
  totalTests: number;
  results: Array<{
    testcaseIndex: number;
    status: string;
    time?: string | null;
    memory?: string | null;
  }>;
}

export interface StatusUpdateEvent {
  type: 'status_update';
  submissionId: string;
  status: SubmissionStatus;
}
