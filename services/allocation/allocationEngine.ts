import * as Crypto from "expo-crypto";
import { getDatabase, runInExclusiveTransaction } from "../db/database";
import { GoalRow, AllocationRuleRow } from "../db/types";

export interface AllocationResultItem {
  ruleId: string;
  goalId: string;
  goalTitle: string;
  allocatedAmountCents: number;
  remainingGoalCapCents: number;
  goalCompleted: boolean;
}

export interface AutoAllocationSummary {
  incomeAmountCents: number;
  totalAllocatedCents: number;
  remainingIncomeCents: number;
  breakdown: AllocationResultItem[];
}

/**
 * Evaluates active auto-allocation rules for an incoming income paycheck/deposit.
 * Clamps allocations according to Goal Cap Protection (target - current).
 * Updates goal balances, goal completion statuses, and records goal_contributions inside an ACID transaction.
 *
 * @param incomeAmountCents Total income amount in integer cents.
 * @param categoryId Optional category filter (matches rule category_id OR rules with NULL category_id).
 * @param transactionId Optional associated transaction ID for contribution audit tracking.
 * @param externalTxn Optional active transaction object if running inside an existing exclusive transaction.
 */
export async function evaluateAutoAllocations(
  incomeAmountCents: number,
  categoryId?: string,
  transactionId?: string,
  externalTxn?: any
): Promise<AutoAllocationSummary> {
  const roundedIncome = Math.round(incomeAmountCents);
  if (roundedIncome <= 0) {
    return {
      incomeAmountCents: 0,
      totalAllocatedCents: 0,
      remainingIncomeCents: 0,
      breakdown: [],
    };
  }

  const db = await getDatabase();

  const executeCoreLogic = async (txn: any) => {
    // 1. Fetch active rules matching minimum income threshold & optional category
    let query = `
      SELECT r.*, g.title as goal_title, g.target_amount_cents, g.current_amount_cents, g.status as goal_status
      FROM allocation_rules r
      JOIN goals g ON r.goal_id = g.id
      WHERE r.is_active = 1
        AND g.status = 'active'
        AND ? >= r.min_income_cents
    `;
    const params: (string | number)[] = [roundedIncome];

    if (categoryId) {
      query += ` AND (r.category_id IS NULL OR r.category_id = ?)`;
      params.push(categoryId);
    }

    query += `
      ORDER BY 
        CASE r.rule_type
          WHEN 'fixed_cents' THEN 1
          WHEN 'percentage' THEN 2
          ELSE 3
        END ASC,
        r.id ASC;
    `;

    type JoinedRuleRow = AllocationRuleRow & {
      goal_title: string;
      target_amount_cents: number;
      current_amount_cents: number;
      goal_status: string;
    };

    const activeRules = await txn.getAllAsync(query, params) as JoinedRuleRow[];

    if (!activeRules || activeRules.length === 0) {
      return {
        incomeAmountCents: roundedIncome,
        totalAllocatedCents: 0,
        remainingIncomeCents: roundedIncome,
        breakdown: [],
      };
    }

    let unallocatedIncomeCents = roundedIncome;
    const breakdown: AllocationResultItem[] = [];
    const now = new Date().toISOString();

    for (const rule of activeRules) {
      if (unallocatedIncomeCents <= 0) break;

      // Fetch fresh goal state inside transaction in case multiple rules target same goal
      const currentGoal = await txn.getFirstAsync(
        `SELECT id, title, target_amount_cents, current_amount_cents, status FROM goals WHERE id = ?;`,
        [rule.goal_id]
      ) as GoalRow | null;

      if (!currentGoal || currentGoal.status !== "active") {
        continue;
      }

      const remainingGoalCapCents = Math.max(
        0,
        currentGoal.target_amount_cents - currentGoal.current_amount_cents
      );

      if (remainingGoalCapCents <= 0) {
        // Goal already full, mark completed if needed
        await txn.runAsync(
          `UPDATE goals SET status = 'completed', updated_at = ? WHERE id = ? AND status = 'active';`,
          [now, currentGoal.id]
        );
        continue;
      }

      // Calculate desired raw allocation
      let desiredAllocationCents = 0;
      if (rule.rule_type === "percentage") {
        // e.g. rule.value = 10 for 10%
        desiredAllocationCents = Math.round((roundedIncome * rule.value) / 100);
      } else if (rule.rule_type === "fixed_cents") {
        desiredAllocationCents = Math.round(rule.value);
      } else if (rule.rule_type === "remainder") {
        desiredAllocationCents = unallocatedIncomeCents;
      }

      // Enforce Goal Cap Protection: Clamp allocation
      const finalAllocationCents = Math.min(
        desiredAllocationCents,
        remainingGoalCapCents,
        unallocatedIncomeCents
      );

      if (finalAllocationCents <= 0) {
        continue;
      }

      const newCurrentAmountCents =
        currentGoal.current_amount_cents + finalAllocationCents;
      const isCompleted =
        newCurrentAmountCents >= currentGoal.target_amount_cents;
      const newStatus = isCompleted ? "completed" : "active";

      // 2. Update Goal Balance & Status
      await txn.runAsync(
        `UPDATE goals
         SET current_amount_cents = ?,
             status = ?,
             updated_at = ?
         WHERE id = ?;`,
        [newCurrentAmountCents, newStatus, now, currentGoal.id]
      );

      // 3. Record audit row in goal_contributions
      const contributionId = Crypto.randomUUID();
      await txn.runAsync(
        `INSERT INTO goal_contributions (
          id,
          goal_id,
          transaction_id,
          amount_cents,
          note,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?);`,
        [
          contributionId,
          currentGoal.id,
          transactionId ?? null,
          finalAllocationCents,
          `Auto-allocated: ${rule.rule_type === "percentage" ? `${rule.value}%` : `$${(finalAllocationCents / 100).toFixed(2)}`}`,
          now,
        ]
      );

      unallocatedIncomeCents -= finalAllocationCents;

      breakdown.push({
        ruleId: rule.id,
        goalId: currentGoal.id,
        goalTitle: currentGoal.title,
        allocatedAmountCents: finalAllocationCents,
        remainingGoalCapCents: Math.max(0, currentGoal.target_amount_cents - newCurrentAmountCents),
        goalCompleted: isCompleted,
      });
    }

    const totalAllocatedCents = roundedIncome - unallocatedIncomeCents;

    return {
      incomeAmountCents: roundedIncome,
      totalAllocatedCents,
      remainingIncomeCents: unallocatedIncomeCents,
      breakdown,
    };
  };

  if (externalTxn) {
    return executeCoreLogic(externalTxn);
  }

  return runInExclusiveTransaction(db, async (txn) => {
    return executeCoreLogic(txn);
  });
}
