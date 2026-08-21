export type TransactionType = "income" | "expense" | "transfer";
export type GoalStatus = "active" | "completed" | "archived";
export type RecurringFrequency = "daily" | "weekly" | "biweekly" | "monthly" | "custom";
export type AllocationRuleType = "percentage" | "fixed_cents" | "remainder";
export type CardVariant = "card" | "gold" | "income" | "subtle";

export interface UserPreferenceRow {
  id: string;
  preferred_currency: string;
  biometrics_enabled: number;
  reminders_enabled: number;
  created_at: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  type: "income" | "expense";
  icon_name: string | null;
  icon_family: string | null;
  color_code: string | null;
  is_default: number;
}

export interface GoalRow {
  id: string;
  title: string;
  target_amount_cents: number;
  current_amount_cents: number;
  target_date: string | null;
  status: GoalStatus;
  priority_label: string | null;
  category_tag: string | null;
  icon_name: string | null;
  icon_family: string | null;
  card_variant: CardVariant;
  created_at: string;
  updated_at: string;
}

export interface TransactionRow {
  id: string;
  category_id: string;
  type: TransactionType;
  amount_cents: number;
  note: string | null;
  transaction_date: string;
  idempotency_key: string | null;
  created_at: string;
}

export interface GoalContributionRow {
  id: string;
  goal_id: string;
  transaction_id: string | null;
  amount_cents: number;
  note: string | null;
  created_at: string;
}

export interface RecurringScheduleRow {
  id: string;
  category_id: string;
  title: string;
  type: "income" | "expense";
  amount_cents: number;
  frequency: RecurringFrequency;
  custom_interval_days: number | null;
  day_of_month: number | null;
  start_date: string;
  next_occurrence: string;
  is_active: number;
  created_at: string;
}

export interface AllocationRuleRow {
  id: string;
  goal_id: string;
  category_id: string | null;
  schedule_id?: string | null;
  rule_type: AllocationRuleType;
  value: number;
  min_income_cents: number;
  is_active: number;
}

export interface UserEntitlementRow {
  id: string;
  unlocked_goal_slots: number;
  is_supporter: number;
  ads_watched_count: number;
}
