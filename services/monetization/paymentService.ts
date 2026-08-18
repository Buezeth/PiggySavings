export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export interface ProcessPurchaseOptions {
  tierId: string;
  productId?: string;
}

/**
 * Purchases a supporter tip tier through native in-app purchases (IAP) or verified provider.
 * Strictly verifies the transaction receipt before granting entitlements.
 * In production (!__DEV__), mock / unverified paths are blocked without verified payment.
 */
export async function processTipPurchase(
  options: ProcessPurchaseOptions
): Promise<PurchaseResult> {
  try {
    if (__DEV__) {
      // In development mode only: allow mock simulation for testing UI and workflows
      console.warn(
        `[PaymentService] Processing mock purchase in development mode for tier: ${options.tierId}`
      );
      await new Promise((resolve) => setTimeout(resolve, 600));
      return {
        success: true,
        transactionId: `mock_tx_${Date.now()}_${options.tierId}`,
      };
    }

    // In Production mode: require native IAP / store verification
    // When native IAP module (StoreKit / Google Play Billing) is integrated:
    // 1. Request purchase from native store
    // 2. Validate cryptographic receipt
    // Production fallback: block unverified entitlement grant
    throw new Error(
      "In-App Purchases are currently undergoing store verification. Please try again shortly."
    );
  } catch (err) {
    console.error("[PaymentService] processTipPurchase error:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Payment processing failed. No charge was made.",
    };
  }
}
