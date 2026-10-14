import type { UserSetting_TagMetadata, UserSetting_TagsSetting } from "@/types/proto/api/user_service_pb";

// Cache compiled regexes to avoid re-compiling on every tag render.
const compiledPatternCache = new Map<string, RegExp | null>();

/** Merge exact tag counts without inheriting Object prototype keys. */
export const mergeTagCounts = (...sources: Array<Record<string, number> | undefined>): Record<string, number> => {
  const result = Object.create(null) as Record<string, number>;
  for (const source of sources) {
    for (const [tag, count] of Object.entries(source ?? {})) result[tag] = (result[tag] ?? 0) + count;
  }
  return result;
};

const getCompiledPattern = (pattern: string): RegExp | null => {
  if (compiledPatternCache.has(pattern)) {
    return compiledPatternCache.get(pattern)!;
  }
  let re: RegExp | null = null;
  try {
    re = new RegExp(`^(?:${pattern})$`);
  } catch {
    // Invalid pattern — cache as null so we skip it without retrying.
  }
  compiledPatternCache.set(pattern, re);
  return re;
};

/** A tag rule (its key/pattern plus metadata) resolved for a concrete tag name. */
export interface ResolvedTagRule {
  /** The rule key that matched: the tag name itself, or a regex pattern. */
  pattern: string;
  metadata: UserSetting_TagMetadata;
}

/**
 * Finds the rule that decides how a given tag name looks.
 *
 * Lookup order:
 * 1. Exact key match (O(1) fast path, backward-compatible) — a rule with the
 *    same name as the tag always wins.
 * 2. Iterate all keys as anchored regex patterns (^pattern$) in object order —
 *    the first full tag-name match wins.
 */
export const resolveTagRule = (tag: string, tagsSetting: UserSetting_TagsSetting): ResolvedTagRule | undefined => {
  // Fast path: exact match.
  if (Object.hasOwn(tagsSetting.tags, tag)) {
    return { pattern: tag, metadata: tagsSetting.tags[tag] };
  }

  // Regex path: treat each key as an anchored pattern.
  for (const [pattern, metadata] of Object.entries(tagsSetting.tags)) {
    if (getCompiledPattern(pattern)?.test(tag)) {
      return { pattern, metadata };
    }
  }

  return undefined;
};

/**
 * Finds the first matching TagMetadata for a given tag name. See resolveTagRule
 * for the lookup order; returns undefined when no rule matches.
 */
export const findTagMetadata = (tag: string, tagsSetting: UserSetting_TagsSetting): UserSetting_TagMetadata | undefined =>
  resolveTagRule(tag, tagsSetting)?.metadata;

/**
 * Returns true if the given string is a valid, ReDoS-safe JavaScript regex pattern.
 *
 * Rejects patterns with nested quantifiers (e.g. `(a+)+`) which can cause
 * catastrophic backtracking in JavaScript's regex engine.
 */
export const isValidTagPattern = (pattern: string): boolean => {
  if (!pattern) return false;
  try {
    new RegExp(pattern);
  } catch {
    return false;
  }
  // Reject nested quantifiers: a quantified group whose body itself contains
  // a quantifier — the classic ReDoS shape e.g. (a+)+, (a*b?)+, (x|y+)+.
  if (/\((?:[^()]*[*+?{][^()]*)\)[*+?{]/.test(pattern)) {
    return false;
  }
  return true;
};

/** Whether any of the memo's tags is set to blur its content for this user. */
export const isMemoBlurred = (memo: { tags: string[] }, tagsSetting: UserSetting_TagsSetting | undefined): boolean =>
  tagsSetting !== undefined && memo.tags.some((tag) => findTagMetadata(tag, tagsSetting)?.blurContent === true);
