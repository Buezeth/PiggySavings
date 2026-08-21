import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "./theme";

export type IconFamily = "Ionicons" | "MaterialCommunityIcons";
export type IconDomain =
  | "food"
  | "housing"
  | "transport"
  | "lifestyle"
  | "health"
  | "finance"
  | "milestones";
export type PaletteToken = "primary" | "emerald" | "gold" | "rose";

type IoniconsGlyph = keyof typeof Ionicons.glyphMap;
type MaterialCommunityIconsGlyph = keyof typeof MaterialCommunityIcons.glyphMap;

export type IconDefinition =
  | {
      id: string;
      name: IoniconsGlyph;
      label: string;
      family: "Ionicons";
      domain: IconDomain;
    }
  | {
      id: string;
      name: MaterialCommunityIconsGlyph;
      label: string;
      family: "MaterialCommunityIcons";
      domain: IconDomain;
    };

export interface PaletteStyles {
  token: PaletteToken;
  bgClass: string;
  bgSubtleClass: string;
  borderClass: string;
  textClass: string;
  badgeBgClass: string;
  badgeTextClass: string;
  colorCode: string;
  iconColor: string;
}

/**
 * NativeWind class pairings for design system tokens (primary, emerald, gold, rose)
 */
export const PALETTE_CONFIG: Record<PaletteToken, PaletteStyles> = {
  primary: {
    token: "primary",
    bgClass: "bg-primary",
    bgSubtleClass: "bg-coral-subtle",
    borderClass: "border-2 border-primary-light border-b-4 border-b-primary-dark",
    textClass: "text-primary",
    badgeBgClass: "bg-coral-subtle",
    badgeTextClass: "text-text-brand",
    colorCode: colors.primary,
    iconColor: colors.primary,
  },
  emerald: {
    token: "emerald",
    bgClass: "bg-emerald",
    bgSubtleClass: "bg-emerald-subtle",
    borderClass: "border-2 border-emerald-border border-b-4 border-b-emerald-border-dark",
    textClass: "text-emerald",
    badgeBgClass: "bg-emerald-subtle",
    badgeTextClass: "text-emerald-dark",
    colorCode: colors.emerald,
    iconColor: colors.emerald,
  },
  gold: {
    token: "gold",
    bgClass: "bg-gold",
    bgSubtleClass: "bg-gold-subtle",
    borderClass: "border-2 border-gold-border border-b-4 border-b-gold-border-dark",
    textClass: "text-gold",
    badgeBgClass: "bg-gold-subtle",
    badgeTextClass: "text-gold-dark",
    colorCode: colors.goldDark,
    iconColor: colors.goldDark,
  },
  rose: {
    token: "rose",
    bgClass: "bg-rose",
    bgSubtleClass: "bg-rose-subtle",
    borderClass: "border-2 border-rose-border border-b-4 border-b-rose-border-dark",
    textClass: "text-rose",
    badgeBgClass: "bg-rose-subtle",
    badgeTextClass: "text-rose-dark",
    colorCode: colors.rose,
    iconColor: colors.rose,
  },
};

/**
 * 50+ Curated, typesafe vector icons spanning 7 domains.
 * All names strictly match vector icon glyphMaps.
 */
export const ICON_REGISTRY: IconDefinition[] = [
  // --- FOOD DOMAIN (8 icons) ---
  {
    id: "food-dining",
    name: "restaurant-outline",
    label: "Dining",
    family: "Ionicons",
    domain: "food",
  },
  {
    id: "food-groceries",
    name: "cart-outline",
    label: "Groceries",
    family: "Ionicons",
    domain: "food",
  },
  {
    id: "food-coffee",
    name: "cafe-outline",
    label: "Coffee & Drinks",
    family: "Ionicons",
    domain: "food",
  },
  {
    id: "food-fastfood",
    name: "fast-food-outline",
    label: "Fast Food",
    family: "Ionicons",
    domain: "food",
  },
  {
    id: "food-pizza",
    name: "pizza-outline",
    label: "Pizza",
    family: "Ionicons",
    domain: "food",
  },
  {
    id: "food-beer",
    name: "beer-outline",
    label: "Bar & Pub",
    family: "Ionicons",
    domain: "food",
  },
  {
    id: "food-icecream",
    name: "ice-cream-outline",
    label: "Dessert",
    family: "Ionicons",
    domain: "food",
  },
  {
    id: "food-nutrition",
    name: "nutrition-outline",
    label: "Fresh Food",
    family: "Ionicons",
    domain: "food",
  },

  // --- HOUSING DOMAIN (8 icons) ---
  {
    id: "housing-rent",
    name: "home-outline",
    label: "Rent & Mortgage",
    family: "Ionicons",
    domain: "housing",
  },
  {
    id: "housing-utilities",
    name: "flash-outline",
    label: "Electricity",
    family: "Ionicons",
    domain: "housing",
  },
  {
    id: "housing-water",
    name: "water-outline",
    label: "Water & Gas",
    family: "Ionicons",
    domain: "housing",
  },
  {
    id: "housing-wifi",
    name: "wifi-outline",
    label: "Internet & Cable",
    family: "Ionicons",
    domain: "housing",
  },
  {
    id: "housing-maintenance",
    name: "build-outline",
    label: "Home Repair",
    family: "Ionicons",
    domain: "housing",
  },
  {
    id: "housing-bed",
    name: "bed-outline",
    label: "Furniture",
    family: "Ionicons",
    domain: "housing",
  },
  {
    id: "housing-trash",
    name: "trash-outline",
    label: "Services & Trash",
    family: "Ionicons",
    domain: "housing",
  },
  {
    id: "housing-key",
    name: "key-outline",
    label: "Rent / Deposit",
    family: "Ionicons",
    domain: "housing",
  },

  // --- TRANSPORT DOMAIN (8 icons) ---
  {
    id: "transport-car",
    name: "car-outline",
    label: "Car",
    family: "Ionicons",
    domain: "transport",
  },
  {
    id: "transport-fuel",
    name: "gas-station-outline",
    label: "Fuel / Gas",
    family: "MaterialCommunityIcons",
    domain: "transport",
  },
  {
    id: "transport-bus",
    name: "bus-outline",
    label: "Public Bus",
    family: "Ionicons",
    domain: "transport",
  },
  {
    id: "transport-train",
    name: "subway-outline",
    label: "Train & Subway",
    family: "Ionicons",
    domain: "transport",
  },
  {
    id: "transport-airplane",
    name: "airplane-outline",
    label: "Flights & Travel",
    family: "Ionicons",
    domain: "transport",
  },
  {
    id: "transport-bicycle",
    name: "bicycle-outline",
    label: "Bicycle",
    family: "Ionicons",
    domain: "transport",
  },
  {
    id: "transport-parking",
    name: "car-sport-outline",
    label: "Parking & Tolls",
    family: "Ionicons",
    domain: "transport",
  },
  {
    id: "transport-boat",
    name: "boat-outline",
    label: "Ferry / Boat",
    family: "Ionicons",
    domain: "transport",
  },

  // --- LIFESTYLE DOMAIN (8 icons) ---
  {
    id: "lifestyle-gaming",
    name: "game-controller-outline",
    label: "Gaming",
    family: "Ionicons",
    domain: "lifestyle",
  },
  {
    id: "lifestyle-shopping",
    name: "bag-handle-outline",
    label: "Shopping",
    family: "Ionicons",
    domain: "lifestyle",
  },
  {
    id: "lifestyle-film",
    name: "film-outline",
    label: "Movies & Cinema",
    family: "Ionicons",
    domain: "lifestyle",
  },
  {
    id: "lifestyle-music",
    name: "musical-notes-outline",
    label: "Music & Streaming",
    family: "Ionicons",
    domain: "lifestyle",
  },
  {
    id: "lifestyle-book",
    name: "book-outline",
    label: "Books & Education",
    family: "Ionicons",
    domain: "lifestyle",
  },
  {
    id: "lifestyle-camera",
    name: "camera-outline",
    label: "Hobbies & Photos",
    family: "Ionicons",
    domain: "lifestyle",
  },
  {
    id: "lifestyle-shirt",
    name: "shirt-outline",
    label: "Clothing & Apparel",
    family: "Ionicons",
    domain: "lifestyle",
  },
  {
    id: "lifestyle-paw",
    name: "paw-outline",
    label: "Pets & Care",
    family: "Ionicons",
    domain: "lifestyle",
  },

  // --- HEALTH DOMAIN (8 icons) ---
  {
    id: "health-heart",
    name: "heart-outline",
    label: "Healthcare",
    family: "Ionicons",
    domain: "health",
  },
  {
    id: "health-fitness",
    name: "barbell-outline",
    label: "Fitness & Gym",
    family: "Ionicons",
    domain: "health",
  },
  {
    id: "health-meds",
    name: "medkit-outline",
    label: "Pharmacy & Meds",
    family: "Ionicons",
    domain: "health",
  },
  {
    id: "health-dental",
    name: "tooth-outline",
    label: "Dental Care",
    family: "MaterialCommunityIcons",
    domain: "health",
  },
  {
    id: "health-eye",
    name: "eye-outline",
    label: "Vision / Optical",
    family: "Ionicons",
    domain: "health",
  },
  {
    id: "health-spa",
    name: "spa-outline",
    label: "Wellness & Spa",
    family: "MaterialCommunityIcons",
    domain: "health",
  },
  {
    id: "health-bandage",
    name: "bandage-outline",
    label: "First Aid & Clinic",
    family: "Ionicons",
    domain: "health",
  },
  {
    id: "health-body",
    name: "body-outline",
    label: "Personal Care",
    family: "Ionicons",
    domain: "health",
  },

  // --- FINANCE DOMAIN (8 icons) ---
  {
    id: "finance-salary",
    name: "cash-outline",
    label: "Salary & Wages",
    family: "Ionicons",
    domain: "finance",
  },
  {
    id: "finance-freelance",
    name: "briefcase-outline",
    label: "Freelance & Consulting",
    family: "Ionicons",
    domain: "finance",
  },
  {
    id: "finance-invest",
    name: "trending-up-outline",
    label: "Investments & Dividends",
    family: "Ionicons",
    domain: "finance",
  },
  {
    id: "finance-card",
    name: "card-outline",
    label: "Credit / Debit Card",
    family: "Ionicons",
    domain: "finance",
  },
  {
    id: "finance-wallet",
    name: "wallet-outline",
    label: "Wallet & Cash",
    family: "Ionicons",
    domain: "finance",
  },
  {
    id: "finance-tax",
    name: "receipt-outline",
    label: "Taxes & Invoices",
    family: "Ionicons",
    domain: "finance",
  },
  {
    id: "finance-gift",
    name: "gift-outline",
    label: "Gift & Grants",
    family: "Ionicons",
    domain: "finance",
  },
  {
    id: "finance-piggy",
    name: "piggy-bank-outline",
    label: "Savings & Deposits",
    family: "MaterialCommunityIcons",
    domain: "finance",
  },

  // --- MILESTONES DOMAIN (8 icons) ---
  {
    id: "milestones-trophy",
    name: "trophy-outline",
    label: "Major Milestone",
    family: "Ionicons",
    domain: "milestones",
  },
  {
    id: "milestones-star",
    name: "star-outline",
    label: "Special Goal",
    family: "Ionicons",
    domain: "milestones",
  },
  {
    id: "milestones-flag",
    name: "flag-outline",
    label: "Goal Target",
    family: "Ionicons",
    domain: "milestones",
  },
  {
    id: "milestones-school",
    name: "school-outline",
    label: "Graduation / Education",
    family: "Ionicons",
    domain: "milestones",
  },
  {
    id: "milestones-diamond",
    name: "diamond-outline",
    label: "Luxury / Wealth",
    family: "Ionicons",
    domain: "milestones",
  },
  {
    id: "milestones-sparkles",
    name: "sparkles-outline",
    label: "Celebration",
    family: "Ionicons",
    domain: "milestones",
  },
  {
    id: "milestones-shield",
    name: "shield-checkmark-outline",
    label: "Emergency Fund",
    family: "Ionicons",
    domain: "milestones",
  },
  {
    id: "milestones-rocket",
    name: "rocket-outline",
    label: "Dream Project",
    family: "Ionicons",
    domain: "milestones",
  },
];

/**
 * Lookup an icon definition by ID. Falls back to first icon if not found.
 */
export function getIconById(id: string): IconDefinition {
  const found = ICON_REGISTRY.find((icon) => icon.id === id);
  return found ?? ICON_REGISTRY[0];
}

/**
 * Filter / search icons by search query and optional domain.
 */
export function searchIcons(
  query: string,
  domain?: IconDomain
): IconDefinition[] {
  const normalized = query.trim().toLowerCase();

  return ICON_REGISTRY.filter((icon) => {
    const matchesDomain = !domain || icon.domain === domain;
    if (!matchesDomain) return false;

    if (!normalized) return true;

    return (
      icon.label.toLowerCase().includes(normalized) ||
      icon.id.toLowerCase().includes(normalized) ||
      icon.name.toLowerCase().includes(normalized)
    );
  });
}
