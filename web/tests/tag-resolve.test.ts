import { create } from "@bufbuild/protobuf";
import { describe, expect, test } from "vitest";
import { findTagMetadata, resolveTagRule } from "@/lib/tag";
import { UserSetting_TagMetadataSchema, UserSetting_TagsSettingSchema } from "@/types/proto/api/user_service_pb";

// Builds a tags setting from [pattern, blurContent] pairs, preserving order.
const setting = (...rules: Array<[string, boolean]>) =>
  create(UserSetting_TagsSettingSchema, {
    tags: Object.fromEntries(rules.map(([pattern, blur]) => [pattern, create(UserSetting_TagMetadataSchema, { blurContent: blur })])),
  });

describe("resolveTagRule", () => {
  test("prefers the same-name rule even when a regex also matches", () => {
    const tags = setting([".*", true], ["work", false]);

    expect(resolveTagRule("work", tags)).toMatchObject({ pattern: "work" });
    expect(resolveTagRule("work", tags)?.metadata.blurContent).toBe(false);
  });

  test("takes the first anchored regex match in rule order", () => {
    const tags = setting(["a.*", true], [".*b", false]);

    // "ab" matches both; the earlier rule wins.
    expect(resolveTagRule("ab", tags)).toMatchObject({ pattern: "a.*" });
    // Only ".*b" matches.
    expect(resolveTagRule("xb", tags)).toMatchObject({ pattern: ".*b" });
  });

  test("matches the full tag name only", () => {
    const tags = setting(["work", true]);

    expect(resolveTagRule("work", tags)).toBeDefined();
    expect(resolveTagRule("homework", tags)).toBeUndefined();
    expect(resolveTagRule("work/home", tags)).toBeUndefined();
  });

  test("skips invalid regex patterns for other tag names", () => {
    // "*" is not a valid regex; it must be skipped without throwing.
    const tags = setting(["*", true], ["ok", false]);

    expect(resolveTagRule("other", tags)).toBeUndefined();
    expect(resolveTagRule("ok", tags)).toMatchObject({ pattern: "ok" });
    // A rule always matches its own key via the same-name fast path.
    expect(resolveTagRule("*", tags)).toMatchObject({ pattern: "*" });
  });

  test("returns undefined when nothing matches", () => {
    expect(resolveTagRule("anything", setting(["project/.*", true]))).toBeUndefined();
  });
});

describe("findTagMetadata", () => {
  test("returns the metadata of the resolved rule", () => {
    const tags = setting(["project/.*", true], ["work", false]);

    expect(findTagMetadata("project/x", tags)?.blurContent).toBe(true);
    expect(findTagMetadata("work", tags)?.blurContent).toBe(false);
    expect(findTagMetadata("other", tags)).toBeUndefined();
  });
});
