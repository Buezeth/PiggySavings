import React from "react";
import { StyleProp, TouchableOpacity, View, ViewStyle } from "react-native";

export type CartoonCardVariant =
  | "card"
  | "accent"
  | "subtle"
  | "income"
  | "income-solid"
  | "expense"
  | "expense-solid"
  | "gold"
  | "gold-solid";

interface CartoonCardProps {
  children: React.ReactNode;
  variant?: CartoonCardVariant;
  style?: StyleProp<ViewStyle>;
  className?: string;
  onPress?: () => void;
  interactive?: boolean;
}

/**
 * CartoonCard: Playful, tactile container styled after modern gamified apps (Duolingo style).
 * Features a distinct bottom extruded border/shadow for a chunky 3D pop effect.
 * Dynamically pairs surface backgrounds with matching extruded bottom shadows.
 */
export const CartoonCard: React.FC<CartoonCardProps> = ({
  children,
  variant = "card",
  style,
  className = "",
  onPress,
  interactive = false,
}) => {
  let bgClass = "bg-bg-card";
  let borderClass = "border-2 border-border-card border-b-4 border-b-border-card-dark";

  switch (variant) {
    case "accent":
      bgClass = "bg-primary";
      borderClass = "border-2 border-primary-light border-b-4 border-b-primary-dark";
      break;
    case "subtle":
      bgClass = "bg-coral-subtle";
      borderClass = "border-2 border-border-card border-b-4 border-b-border-card-dark";
      break;
    case "income":
      bgClass = "bg-emerald-subtle";
      borderClass = "border-2 border-emerald-border border-b-4 border-b-emerald-border-dark";
      break;
    case "income-solid":
      bgClass = "bg-emerald";
      borderClass = "border-2 border-emerald-light border-b-4 border-b-emerald-dark";
      break;
    case "expense":
      bgClass = "bg-rose-subtle";
      borderClass = "border-2 border-rose-border border-b-4 border-b-rose-border-dark";
      break;
    case "expense-solid":
      bgClass = "bg-rose";
      borderClass = "border-2 border-rose-light border-b-4 border-b-rose-dark";
      break;
    case "gold":
      bgClass = "bg-gold-subtle";
      borderClass = "border-2 border-gold-border border-b-4 border-b-gold-border-dark";
      break;
    case "gold-solid":
      bgClass = "bg-gold";
      borderClass = "border-2 border-gold-light border-b-4 border-b-gold-dark";
      break;
    case "card":
    default:
      bgClass = "bg-bg-card";
      borderClass = "border-2 border-border-card border-b-4 border-b-border-card-dark";
      break;
  }

  const baseClasses = `will-change-variable rounded-3xl p-4 ${bgClass} ${borderClass} ${className}`;

  if (onPress || interactive) {
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        style={style}
        className={baseClasses}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={style} className={baseClasses}>
      {children}
    </View>
  );
};

export default CartoonCard;
