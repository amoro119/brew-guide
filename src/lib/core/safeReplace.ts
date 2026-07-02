export type ReplaceSafetyCheck = {
  nextCount: number;
  existingCount: number;
  allowEmptyReplace?: boolean;
  allowDestructiveReplace?: boolean;
};

export function shouldSkipDestructiveReplace({
  nextCount,
  existingCount,
  allowEmptyReplace = false,
  allowDestructiveReplace = false,
}: ReplaceSafetyCheck): boolean {
  if (allowDestructiveReplace) {
    return false;
  }

  if (nextCount === 0) {
    return !allowEmptyReplace && existingCount > 0;
  }

  return existingCount > 1 && nextCount < existingCount;
}
