// tests/trackers.test.ts
import { describe, it, expect } from "vitest";
import { syncAllCodingTrackers } from "../lib/integrations";
import { LeetCodeFetcher } from "../lib/integrations/leetcode";
import { CodeforcesFetcher } from "../lib/integrations/codeforces";

describe("Coding Trackers Integration", () => {
  it("should sync platforms and provide normalized statistics", async () => {
    const stats = await syncAllCodingTrackers({
      leetcode: "test_user",
      codeforces: "test_user",
      gfg: "test_user",
      codechef: "test_user",
    });

    expect(stats.length).toBe(4);
    const platforms = stats.map((s) => s.platform);
    expect(platforms).toContain("leetcode");
    expect(platforms).toContain("codeforces");
    expect(platforms).toContain("gfg");
    expect(platforms).toContain("codechef");

    for (const s of stats) {
      expect(typeof s.solved).toBe("number");
      expect(s.solved).toBeGreaterThanOrEqual(0);
      expect(s.lastSynced).toBeDefined();
    }
  });

  it("should handle empty or failing usernames with resilient fallbacks", async () => {
    const lc = new LeetCodeFetcher();
    const cf = new CodeforcesFetcher();

    const lcRes = await lc.fetchStats("");
    expect(lcRes.platform).toBe("leetcode");
    expect(lcRes.error).toBeDefined();

    const cfRes = await cf.fetchStats("");
    expect(cfRes.platform).toBe("codeforces");
    expect(cfRes.error).toBeDefined();
  });
});
