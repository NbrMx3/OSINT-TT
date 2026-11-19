import type { IntelligenceSource } from "./email";

export interface UsernameProfile {
  platform: string;
  username: string;
  profileUrl: string;
  confidence: { score: number; level: "high" | "moderate" | "low"; method: string };
  metadata: Record<string, unknown>;
}
export interface UsernameCollectionData { username: string; collectedAt: string; profiles: UsernameProfile[]; sources: IntelligenceSource[]; confidenceMethod: string; }
export interface UsernameResult { id: string; username: string; status: string; data: UsernameCollectionData; sourceReferences: IntelligenceSource[] | null; collectedAt: string; investigation: { id: string; name: string; status: string }; }
export interface UsernameHistoryItem { id: string; username: string; status: string; collectedAt: string; investigation: { id: string; name: string; status: string }; }
