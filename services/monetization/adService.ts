import { unlockGoalSlot } from "../../repositories/entitlementRepo";

export interface RewardedAdResult {
  success: boolean;
  rewardEarned: boolean;
  unlockedGoalSlots?: number;
  error?: string;
}

/**
 * Rewarded Ad Adapter Service.
 * Coordinates showing a rewarded video ad and crediting +1 goal slot upon completion.
 *
 * In offline / zero-backend mode or dev environment, it provides an instant simulation
 * with realistic timing and callback triggers.
 */
export async function showRewardedGoalUnlockAd(
  onRewardEarned?: (newSlotCount: number) => Promise<void> | void
): Promise<RewardedAdResult> {
  try {
    // 1. Simulate ad presentation latency (500ms playback feel)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 2. Persist reward in SQLite
    const updatedEntitlements = await unlockGoalSlot();

    // 3. Trigger optional listener / state refresh
    if (onRewardEarned) {
      await onRewardEarned(updatedEntitlements.unlocked_goal_slots);
    }

    return {
      success: true,
      rewardEarned: true,
      unlockedGoalSlots: updatedEntitlements.unlocked_goal_slots,
    };
  } catch (err) {
    console.error("[AdService] showRewardedGoalUnlockAd error:", err);
    return {
      success: false,
      rewardEarned: false,
      error: err instanceof Error ? err.message : "Failed to display rewarded ad",
    };
  }
}
