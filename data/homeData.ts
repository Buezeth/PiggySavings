export type TimePeriod = "7D" | "30D" | "90D";

export interface HeroMetric {
  id: string;
  label: string;
  value: string;
  change: string;
  trendDirection: "up" | "down";
}

export interface HeroData {
  title: string;
  subtitle: string;
  healthScore: number;
  maxHealthScore: number;
  scoreTrend: {
    text: string;
    direction: "up" | "down";
  };
  metrics: HeroMetric[];
}

export interface FeaturedGoalData {
  id: string;
  title: string;
  targetDate: string;
  priorityLabel: string;
  currentAmount: number;
  targetAmount: number;
  currency: string;
  iconName: string;
  iconFamily: "MaterialCommunityIcons" | "Ionicons";
}

export interface SavingsGoalItem {
  id: string;
  title: string;
  savedAmount: number;
  targetAmount: number;
  currency: string;
  progressColorToken: "gold" | "primary";
  iconName: string;
  iconFamily: "Ionicons" | "MaterialCommunityIcons";
}

export interface HomeDashboardData {
  hero: HeroData;
  featuredGoal: FeaturedGoalData;
  activeGoals: SavingsGoalItem[];
}

export const homeDashboardData: HomeDashboardData = {
  hero: {
    title: "Savings Report",
    subtitle: "piggysavings.app",
    healthScore: 82,
    maxHealthScore: 100,
    scoreTrend: {
      text: "6 pts vs last month",
      direction: "up",
    },
    metrics: [
      {
        id: "total_saved",
        label: "Total Saved",
        value: "$12.4K",
        change: "12%",
        trendDirection: "up",
      },
      {
        id: "target_goal",
        label: "Target Goal",
        value: "$15.0K",
        change: "85%",
        trendDirection: "up",
      },
      {
        id: "velocity",
        label: "Velocity",
        value: "+$820",
        change: "1.2x",
        trendDirection: "up",
      },
    ],
  },
  featuredGoal: {
    id: "dream_studio_setup",
    title: "Dream Studio Setup",
    targetDate: "Target: Dec 2026",
    priorityLabel: "High Priority",
    currentAmount: 3200,
    targetAmount: 4000,
    currency: "$",
    iconName: "laptop",
    iconFamily: "MaterialCommunityIcons",
  },
  activeGoals: [
    {
      id: "japan_trip",
      title: "Japan Trip",
      savedAmount: 1800,
      targetAmount: 3000,
      currency: "$",
      progressColorToken: "gold",
      iconName: "airplane-outline",
      iconFamily: "Ionicons",
    },
    {
      id: "emergency_fund",
      title: "Emergency Fund",
      savedAmount: 7450,
      targetAmount: 8000,
      currency: "$",
      progressColorToken: "primary",
      iconName: "shield-checkmark-outline",
      iconFamily: "Ionicons",
    },
  ],
};
