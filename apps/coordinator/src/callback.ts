import { Router, Request, Response } from 'express';
import prisma from '@codera/db';
import { mapJudge0StatusToVerdict, JUDGE0_STATUS } from '@codera/types';
import type { Judge0CallbackBody, Verdict } from '@codera/types';
import { aggregator } from './aggregator';
import { publishSubmissionEvent } from './publisher';

const router = Router();

/**
 * POST /callback/:submissionId/:testcaseIndex
 *
 * Called by Judge0 after each testcase execution completes.
 * This is the Codeforces-style per-test callback.
 */
router.post('/callback/:submissionId/:testcaseIndex', async (req: Request, res: Response) => {
  const { submissionId, testcaseIndex: testcaseIndexStr } = req.params;
  const testcaseIndex = parseInt(testcaseIndexStr, 10);

  try {
    const body = req.body as Judge0CallbackBody;

    console.log(`[Callback] Received for ${submissionId} testcase ${testcaseIndex}:`, {
      statusId: body.status?.id,
      statusDesc: body.status?.description,
    });

    // Ignore in-queue / processing callbacks — not finished yet
    const statusId = body.status?.id;
    if (statusId && statusId < JUDGE0_STATUS.ACCEPTED) {
      return res.status(200).json({ message: 'Acknowledged — still processing' });
    }

    // Map Judge0 status to our verdict
    const verdict: Verdict = statusId
      ? mapJudge0StatusToVerdict(statusId)
      : 'INTERNAL_ERROR';

    // 1. Persist result in DB (upsert for idempotency)
    await prisma.submissionResult.upsert({
      where: {
        submissionId_testcaseIndex: {
          submissionId,
          testcaseIndex,
        },
      },
      update: {
        status: verdict,
        time: body.time ?? null,
        memory: body.memory ? String(body.memory) : null,
        stdout: body.stdout?.substring(0, 500) ?? null,
        stderr: (body.stderr || body.compile_output)?.substring(0, 500) ?? null,
      },
      create: {
        submissionId,
        testcaseIndex,
        status: verdict,
        time: body.time ?? null,
        memory: body.memory ? String(body.memory) : null,
        stdout: body.stdout?.substring(0, 500) ?? null,
        stderr: (body.stderr || body.compile_output)?.substring(0, 500) ?? null,
      },
    });

    // 2. Publish per-test event live
    await publishSubmissionEvent(submissionId, {
      type: 'test_result',
      submissionId,
      testcaseIndex,
      verdict,
      time: body.time,
      memory: body.memory ? String(body.memory) : null,
    });

    // 3. Update in-memory aggregation
    const isLast = aggregator.recordResult(submissionId, {
      testcaseIndex,
      status: verdict,
      verdict,
      time: body.time,
      memory: body.memory ? String(body.memory) : null,
    });

    // 4. If last testcase → compute final verdict
    if (isLast) {
      const final = aggregator.computeFinalVerdict(submissionId);

      // Update submission in DB
      await prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: 'finished',
          verdict: final.verdict,
          passedTests: final.passedTests,
          totalTests: final.totalTests,
        },
      });

      // Publish final verdict
      await publishSubmissionEvent(submissionId, {
        type: 'final_verdict',
        submissionId,
        verdict: final.verdict,
        passedTests: final.passedTests,
        totalTests: final.totalTests,
        results: final.results.map((r) => ({
          testcaseIndex: r.testcaseIndex,
          status: r.status,
          time: r.time,
          memory: r.memory,
        })),
      });

      console.log(
        `[Callback] FINAL VERDICT for ${submissionId}: ${final.verdict} (${final.passedTests}/${final.totalTests})`
      );
    }

    return res.status(200).json({ message: 'Processed' });
  } catch (err) {
    console.error(`[Callback] Error processing ${submissionId}/${testcaseIndex}:`, err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as callbackRouter };
export default router;
