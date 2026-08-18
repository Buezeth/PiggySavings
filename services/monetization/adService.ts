import { unlockGoalSlot } from "../../repositories/entitlementRepo";

export interface RewardedAdResult {
  success: boolean;
  rewardEarned: boolean;
  unlockedGoalSlots?: number;
  error?: string;
}

/**
 * Rewarded Ad Adapter Service.
 * Coordinates showing a rewarded video ad and crediting +1 goal slot upon verified completion.
 *
 * Mock rewards are strictly gated to development builds (__DEV__).
 * In production, unverified delay paths are blocked.
 */
export async function showRewardedGoalUnlockAd(
  onRewardEarned?: (newSlotCount: number) => Promise<void> | void
): Promise<RewardedAdResult> {
  try {
    if (__DEV__) {
      // 1. Development mode: simulate rewarded ad playback
      console.warn("[AdService] Simulating rewarded ad playback in DEV mode");
      await new Promise((resolve) => setTimeout(resolve, 600));

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
    }

    // Production mode: Require native AdMob / MAX SDK verification
    throw new Error(
      "Rewarded ad network is currently unavailable. Please try again later."
    );
  } catch (err) {
    console.error("[AdService] showRewardedGoalUnlockAd error:", err);
    return {
      success: false,
      rewardEarned: false,
      error: err instanceof Error ? err.message : "Failed to display rewarded ad",
    };
  }
}
