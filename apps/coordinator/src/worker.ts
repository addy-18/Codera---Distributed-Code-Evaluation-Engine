import { Worker } from 'bullmq';
import fs from 'fs';
import path from 'path';
import config from '@codera/config';
import prisma from '@codera/db';
import type { SubmissionJobPayload } from '@codera/types';
import { judge0Client } from './judge0';
import { aggregator } from './aggregator';
import { publishSubmissionEvent } from './publisher';

// Parse Redis URL for BullMQ connection (avoids ioredis type mismatch)
function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port, 10) || 6379,
    password: parsed.password || undefined,
    maxRetriesPerRequest: null as null,
  };
}

const connection = parseRedisUrl(config.redisUrl);

/**
 * Start the BullMQ worker consuming from `submission-queue`.
 *
 * For each job:
 * 1. Load submission from DB
 * 2. Discover testcases on local FS
 * 3. Submit each testcase independently to Judge0 with callback
 * 4. Update submission status to 'running'
 */
// Map Judge0 language IDs to full-boilerplate file extensions
const LANG_EXT_MAP: Record<number, string> = {
  54: 'cpp',   // C++ (GCC 9.2.0)
  76: 'cpp',   // C++ (Clang 7.0.1)
  62: 'java',  // Java (OpenJDK 13.0.1)
  71: 'py',    // Python (3.8.1)
  70: 'py',    // Python (2.7.17)
};

/** Number of testcases to run in 'run' mode (Run Code button) */
const RUN_MODE_LIMIT = 3;

export function startWorker(): void {
  const worker = new Worker<SubmissionJobPayload>(
    'submission-queue',
    async (job) => {
      const { submissionId, mode } = job.data;
      console.log(`[Worker] Processing job for submission ${submissionId} (mode=${mode})`);

      try {
        // 1. Load submission from DB
        const submission = await prisma.submission.findUnique({
          where: { id: submissionId },
        });

        if (!submission) {
          throw new Error(`Submission ${submissionId} not found`);
        }

        // 2. Locate problem on local FS
        // Resolve from monorepo root (3 levels up from this file: src -> coordinator -> apps -> Backend)
        const basePath = config.problemsBasePath.startsWith('.')
          ? path.resolve(__dirname, '..', '..', '..', 'problems')
          : config.problemsBasePath;
        const problemDir = path.resolve(basePath, submission.problemId);

        if (!fs.existsSync(problemDir)) {
          throw new Error(`Problem directory not found: ${problemDir}`);
        }

        // 3. Inject user code into full-boilerplate
        const finalSource = buildFinalSource(
          problemDir,
          submission.languageId,
          submission.sourceCode
        );

        // 4. Discover and optionally limit testcases
        let testcases = discoverTestcases(problemDir);
        if (testcases.length === 0) {
          throw new Error(`No testcases found in ${problemDir}`);
        }

        if (mode === 'run') {
          testcases = testcases.slice(0, RUN_MODE_LIMIT);
        }

        console.log(
          `[Worker] Using ${testcases.length} testcases for problem ${submission.problemId} (mode=${mode})`
        );

        // 5. Register aggregation
        aggregator.register(submissionId, testcases.length);

        // 6. Update submission status to 'running'
        await prisma.submission.update({
          where: { id: submissionId },
          data: {
            status: 'running',
            totalTests: testcases.length,
          },
        });

        // Publish status update via Pub/Sub
        await publishSubmissionEvent(submissionId, {
          type: 'status_update',
          submissionId,
          status: 'running',
        });

        // 7. Submit each testcase independently to Judge0
        for (const tc of testcases) {
          await judge0Client.submitTestcase({
            sourceCode: finalSource,
            languageId: submission.languageId,
            stdin: tc.input,
            expectedOutput: tc.expectedOutput,
            submissionId,
            testcaseIndex: tc.index,
          });
        }

        console.log(
          `[Worker] All ${testcases.length} testcases submitted to Judge0 for ${submissionId}`
        );
      } catch (err) {
        console.error(`[Worker] Failed to process submission ${submissionId}:`, err);

        // Mark submission as finished with error
        await prisma.submission.update({
          where: { id: submissionId },
          data: { status: 'finished', verdict: 'INTERNAL_ERROR' },
        });

        await publishSubmissionEvent(submissionId, {
          type: 'final_verdict',
          submissionId,
          verdict: 'INTERNAL_ERROR',
          passedTests: 0,
          totalTests: 0,
          results: [],
        });

        throw err; // Let BullMQ handle retry
      }
    },
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  console.log('[Worker] BullMQ worker started on queue: submission-queue');
}

// ── Code Injection ──

/**
 * Read the full-boilerplate file for the given language and inject user code.
 * The boilerplate contains a placeholder: `// {{USER_CODE}}` (or `# {{USER_CODE}}` for Python).
 */
function buildFinalSource(
  problemDir: string,
  languageId: number,
  userCode: string
): string {
  const ext = LANG_EXT_MAP[languageId];
  if (!ext) {
    throw new Error(`Unsupported language ID: ${languageId}`);
  }

  const boilerplatePath = path.join(problemDir, `fullboilerplate.${ext}`);
  if (!fs.existsSync(boilerplatePath)) {
    throw new Error(`Full-boilerplate not found: ${boilerplatePath}`);
  }

  const template = fs.readFileSync(boilerplatePath, 'utf-8');

  // Replace the placeholder with user code
  const placeholder = ext === 'py' ? '# {{USER_CODE}}' : '// {{USER_CODE}}';
  if (!template.includes(placeholder)) {
    throw new Error(`Boilerplate missing placeholder (${placeholder}) in ${boilerplatePath}`);
  }

  return template.replace(placeholder, userCode);
}

// ── Testcase Discovery ──

interface Testcase {
  index: number;
  input: string;
  expectedOutput: string;
}

/**
 * Discover testcases from the problem directory.
 *
 * Expected layout:
 *   problems/{problemId}/inputs/1.txt
 *   problems/{problemId}/outputs/1.txt
 *   problems/{problemId}/inputs/2.txt
 *   problems/{problemId}/outputs/2.txt
 *   ...
 */
function discoverTestcases(problemDir: string): Testcase[] {
  const inputsDir = path.join(problemDir, 'inputs');
  const outputsDir = path.join(problemDir, 'outputs');

  if (!fs.existsSync(inputsDir) || !fs.existsSync(outputsDir)) {
    return [];
  }

  const files = fs.readdirSync(inputsDir);
  const testcases: Testcase[] = [];
  const pattern = /^(\d+)\.txt$/;

  for (const file of files) {
    const match = file.match(pattern);
    if (!match) continue;

    const index = parseInt(match[1], 10);
    const inputPath = path.join(inputsDir, file);
    const outputPath = path.join(outputsDir, file);

    if (!fs.existsSync(outputPath)) {
      console.warn(`[Worker] Missing output file for testcase ${index}: ${outputPath}`);
      continue;
    }

    testcases.push({
      index,
      input: fs.readFileSync(inputPath, 'utf-8'),
      expectedOutput: fs.readFileSync(outputPath, 'utf-8'),
    });
  }

  // Sort by index
  return testcases.sort((a, b) => a.index - b.index);
}
