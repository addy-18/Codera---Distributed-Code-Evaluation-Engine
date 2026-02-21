import { Router, Request, Response } from 'express';
import { submissionService } from './submission.service';

const router = Router();

/**
 * POST /submissions
 * Create a new submission and queue it for judging.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, problemId, languageId, sourceCode, mode } = req.body;

    if (!userId || !problemId || !languageId || !sourceCode) {
      return res.status(400).json({
        error: 'Missing required fields: userId, problemId, languageId, sourceCode',
      });
    }

    const submission = await submissionService.createSubmission({
      userId,
      problemId,
      languageId: Number(languageId),
      sourceCode,
      mode: mode === 'run' ? 'run' : 'submit',
    });

    return res.status(201).json({
      id: submission.id,
      status: submission.status,
      createdAt: submission.createdAt,
      message: 'Submission queued for judging',
    });
  } catch (err) {
    console.error('[SubmissionController] Error creating submission:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /submissions/:id
 * Get submission status + per-testcase results.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const submission = await submissionService.getSubmission(req.params.id);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    return res.json(submission);
  } catch (err) {
    console.error('[SubmissionController] Error fetching submission:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /submissions/user/:userId
 * Get recent submissions for a user.
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const submissions = await submissionService.getUserSubmissions(
      req.params.userId,
      limit
    );

    return res.json({ submissions });
  } catch (err) {
    console.error('[SubmissionController] Error fetching user submissions:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
