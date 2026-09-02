// lib/integrations/tracker-types.ts

export type TrackerPlatform = "leetcode" | "codeforces" | "gfg" | "codechef";

export interface NormalizedTrackerStats {
  platform: TrackerPlatform;
  username: string;
  solved: number;
  rating?: number;
  easySolved?: number;
  mediumSolved?: number;
  hardSolved?: number;
  ranking?: number;
  contestsAttended?: number;
  lastSynced: string;
  rawData?: Record<string, any>;
  error?: string;
}

export interface PlatformFetcher {
  fetchStats(username: string): Promise<NormalizedTrackerStats>;
}
