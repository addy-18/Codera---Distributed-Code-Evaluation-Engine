import { Router, Request, Response } from 'express';
import prisma from '@codera/db';

const router = Router();

/**
 * GET /problems
 * Return all problems (for the home page listing).
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const problems = await prisma.problem.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return res.json(problems);
  } catch (err) {
    console.error('[ProblemController] Error listing problems:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /problems/:id
 * Return problem info: name, description, difficulty, constraints,
 * sample test cases, and half-boilerplate code (per language).
 * Accepts both "problem_1" and "1" as the id param.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    let problem = await prisma.problem.findUnique({
      where: { id: req.params.id },
    });

    // Fallback: try with "problem_" prefix (e.g. "1" -> "problem_1")
    if (!problem) {
      problem = await prisma.problem.findUnique({
        where: { id: `problem_${req.params.id}` },
      });
    }

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    return res.json({
      id: problem.id,
      name: problem.name,
      description: problem.description,
      difficulty: problem.difficulty,
      constraints: problem.constraints,
      sampleTestCases: problem.sampleTestCases,
      halfBoilerplate: problem.halfBoilerplate,
    });
  } catch (err) {
    console.error('[ProblemController] Error fetching problem:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
