from typing import List

# {{USER_CODE}}

if __name__ == "__main__":
    n = int(input())
    nums = list(map(int, input().split()))
    target = int(input())

    result = twoSum(nums, target)
    print(result[0], result[1])
