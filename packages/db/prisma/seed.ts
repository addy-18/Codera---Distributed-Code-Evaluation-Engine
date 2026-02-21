import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding problems...');

  await prisma.problem.upsert({
    where: { id: 'problem_1' },
    update: {},
    create: {
      id: 'problem_1',
      name: 'Two Sum',
      description: `Given an array of integers \`nums\` and an integer \`target\`, return the **indices** of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

Return the answer with the **smaller index first**.

### Example 1
**Input:** nums = [2,7,11,15], target = 9
**Output:** 0 1
**Explanation:** Because nums[0] + nums[1] == 9, we return [0, 1].

### Example 2
**Input:** nums = [3,2,4], target = 6
**Output:** 1 2

### Example 3
**Input:** nums = [3,3], target = 6
**Output:** 0 1`,
      difficulty: 'Easy',
      constraints: [
        '2 <= nums.length <= 10^4',
        '-10^9 <= nums[i] <= 10^9',
        '-10^9 <= target <= 10^9',
        'Only one valid answer exists.',
      ],
      sampleTestCases: [
        { input: '4\n2 7 11 15\n9', expectedOutput: '0 1' },
        { input: '3\n3 2 4\n6', expectedOutput: '1 2' },
        { input: '2\n3 3\n6', expectedOutput: '0 1' },
      ],
      halfBoilerplate: {
        cpp: `vector<int> twoSum(vector<int>& nums, int target) {
    // Write your code here
}`,
        java: `public static int[] twoSum(int[] nums, int target) {
    // Write your code here
}`,
        python: `def twoSum(nums: list[int], target: int) -> list[int]:
    # Write your code here
    pass`,
      },
    },
  });

  console.log('Seeded problem_1 (Two Sum)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
