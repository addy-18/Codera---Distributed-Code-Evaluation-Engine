import { submissionRepository } from './submission.repository';
import { submissionQueue } from '../../loaders/queue';
import type { SubmissionJobPayload, SubmissionMode } from '@codera/types';

export const submissionService = {
  async createSubmission(data: {
    userId: string;
    problemId: string;
    languageId: number;
    sourceCode: string;
    mode: SubmissionMode;
  }) {
    // 1. Persist in DB
    const submission = await submissionRepository.create(data);

    // 2. Enqueue to BullMQ — coordinator will pick it up
    const jobPayload: SubmissionJobPayload = {
      submissionId: submission.id,
      mode: data.mode,
    };

    await submissionQueue.add('judge', jobPayload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });

    console.log(`[SubmissionService] Queued submission ${submission.id}`);
    return submission;
  },

  async getSubmission(id: string) {
    return submissionRepository.findById(id);
  },

  async getUserSubmissions(userId: string, limit?: number) {
    return submissionRepository.findByUserId(userId, limit);
  },
};

export default submissionService;
