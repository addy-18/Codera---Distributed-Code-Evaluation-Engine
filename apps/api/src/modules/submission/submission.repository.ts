import prisma from '@codera/db';

export const submissionRepository = {
  async create(data: {
    userId: string;
    problemId: string;
    languageId: number;
    sourceCode: string;
  }) {
    return prisma.submission.create({
      data: {
        userId: data.userId,
        problemId: data.problemId,
        languageId: data.languageId,
        sourceCode: data.sourceCode,
        status: 'queued',
      },
    });
  },

  async findById(id: string) {
    return prisma.submission.findUnique({
      where: { id },
      include: { results: { orderBy: { testcaseIndex: 'asc' } } },
    });
  },

  async findByUserId(userId: string, limit = 20) {
    return prisma.submission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },
};

export default submissionRepository;
