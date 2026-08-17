# AGENTS.md - PiggySavings Rules & Architecture Guidelines

> [!IMPORTANT]
> **Expo HAS CHANGED**: Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

---

## 💡 Project Identity & Product Requirements

PiggySavings is a smart personal finance, goal-oriented savings, and budgeting mobile application built with **React Native (Expo Router)**, **NativeWind v4 (TailwindCSS)**, and modern mobile architectural practices.

All agentic decisions, component implementations, schemas, and features **MUST** strictly adhere to the technical specifications defined in the core project documentation (`docs/Functionalities`).

---

## 📑 Core Functional Specifications

### 1. Data Model & Database Architecture
* Refer to `1. Data Model and Database Schema Design.md`
* Core entities: `Users`, `Wallets/Accounts`, `Categories`, `Transactions` (income, expense, transfer), `Savings Goals`, `Auto-Allocation Rules`, and `Sync Outbox`.
* All transaction amounts are stored in cents/smallest currency unit or 2-decimal precision fixed numbers. Always attach `idempotency_key` (UUID v4) for offline/online transaction creation.

### 2. API & Endpoint Contracts
* Refer to `2. API Endpoint or Contract Design.md`
* Standard response wrapper `{ "success": boolean, "data": ..., "error": ... }`.
* Mobile requests pass Bearer Token (`JWT`) in authorization headers.

### 3. Goal Auto-Allocation Strategy
* Refer to `3. Goal Auto-Allocation Strategy.md`
* Automated distribution of incoming income into savings goals based on percentage, fixed amount, or remaining balance allocations.
* Support priority ordering and fallback rules for goal auto-funding.

### 4. Push Notifications & Behavioral Nudges
* Refer to `4. Push Notifications & Behavioral Nudges.md`
* Micro-nudges, smart alerts, streak reminders, and budget threshold warnings.
* Local scheduled notifications paired with server trigger payloads.

### 5. Security & Data Privacy Architecture
* Refer to `5. Security & Data Privacy Architecture.md`
* Biometric authentication (Expo LocalAuthentication) for fast unlock.
* Sensitive fields stored in `expo-secure-store`.
* Zero plain-text financial log outputs in production.

### 6. Offline-First & Delta Sync Strategy
* Refer to `6. Offline-First Data Sync Strategy.md`
* Local SQLite storage for zero-latency instant reads/writes.
* 2-Way Delta Sync with Offline Outbox queue.
* Goal balance synchronization MUST use **Delta Event Logging Strategy** (`+delta` / `-delta`) rather than replacing absolute balance totals to avoid conflict overwrites.

---

## 🎨 UI/UX & Strict Theme Token Guidelines

> [!IMPORTANT]
> **STRICT THEME ADHERENCE REQUIREMENT**:
> Whenever building or modifying UI screens, components, or styles, AI agents **MUST ALWAYS reference and use the central design theme tokens** defined in [`global.css`](./global.css) and [`constants/theme.ts`](./constants/theme.ts).
> 
> **FORBIDDEN**: AI agents must **NEVER** use hardcoded hex or arbitrary color tokens (e.g. `bg-[#FAF4F0]`, `bg-[#FFFFFF]`, `bg-[#EE6A3B]`, `text-[#331C14]`, `text-[#8C7B75]`, `text-[#A83B1B]`, `border-[#F3ECE7]`, `shadow-[#EE6A3B]/20`) directly in JSX classNames or inline styles.
> 
> **EXTENDING THE DESIGN SYSTEM**: If a new color token, overlay, or state value is needed, you **MUST first declare it in `@theme` in `global.css`** and export the corresponding constant in `constants/theme.ts` before using it in components. Keep both files in complete parity at all times.

### Design Theme Tokens Registry

#### 1. Background Tokens
- App canvas: `bg-bg-app` (`#FAF4F0`)
- Standard card & sheet: `bg-bg-card` (`#FFFFFF`)
- Primary brand accent / Hero background: `bg-primary` (`#EE6A3B`), `bg-primary-dark` (`#D45427`), `bg-primary-light` (`#F48A64`)
- Accent container / Highlight card: `bg-bg-accent` (`#E35D31`)
- Pill & subtle highlight: `bg-coral-subtle` (`#FDF3EF`)
- Income & Success backgrounds: `bg-emerald-subtle` (`#ECFDF5`), `bg-emerald` (`#10B981`)
- Expense & Warning backgrounds: `bg-rose-subtle` (`#FFF1F2`), `bg-rose` (`#F43F5E`)
- Streak & Milestone backgrounds: `bg-gold-subtle` (`#FEF3C7`), `bg-gold` (`#F5B800`)
- Gauge & Translucent Overlays:
  - `bg-white-overlay-10` (`rgba(255, 255, 255, 0.1)`)
  - `bg-white-overlay-20` (`rgba(255, 255, 255, 0.2)`)
  - `bg-white-overlay-30` (`rgba(255, 255, 255, 0.3)`)
  - `bg-white-overlay-40` (`rgba(255, 255, 255, 0.4)`)
  - `bg-white-overlay-80` (`rgba(255, 255, 255, 0.8)`)

#### 2. Text Tokens
- Primary cocoa body / numbers: `text-text-main` (`#331C14`)
- Subtitles & muted labels: `text-text-muted` (`#8C7B75`)
- Brand header accents: `text-text-brand` (`#A83B1B`)
- Primary brand text: `text-primary` (`#EE6A3B`)
- Savings indicators & milestones: `text-gold`, `text-gold-dark` (`#D97706`)
- Trends & Success metrics: `text-trend-up` / `text-emerald` (`#10B981`), `text-emerald-dark` (`#059669`)
- Expenses & Warnings: `text-rose` (`#F43F5E`), `text-rose-dark` (`#E11D48`)
- Light text on brand surfaces: `text-white` (`#FFFFFF`), `text-white-overlay-80` (`rgba(255, 255, 255, 0.8)`)

#### 3. Border & Extruded 3D Bevel Tokens
- Standard card & extruded bottom: `border-border-card` (`#F3ECE7`), `border-b-border-card-dark` (`#E2D5CC`)
- Primary brand extruded borders: `border-primary-light` (`#F48A64`), `border-b-primary-dark` (`#D45427`)
- Income / Emerald extruded borders: `border-emerald-border` (`#A7F3D0`), `border-b-emerald-border-dark` (`#6EE7B7`), `border-b-emerald-dark` (`#059669`)
- Expense / Rose extruded borders: `border-rose-border` (`#FECDD3`), `border-b-rose-border-dark` (`#FDA4AF`), `border-b-rose-dark` (`#E11D48`)
- Streak / Gold extruded borders: `border-gold-border` (`#FDE68A`), `border-b-gold-border-dark` (`#F59E0B`), `border-b-gold-dark` (`#D97706`)
- Translucent hero borders: `border-white-overlay-10`, `border-white-overlay-20`

#### 4. Shadow Tokens
- Primary glow: `shadow-primary/20`, `shadow-primary/25`, `shadow-primary/35`
- Elevation: `shadow-sm`, `shadow-md`, `shadow-lg`

---

## 🎮 Playful Cartoon / Gamified (Duolingo-Style) Visual Language

PiggySavings embraces a vibrant, tactile, gamified aesthetic (inspired by Duolingo) designed to make saving feel playful and rewarding:

### 1. Extruded 3D Cards & Buttons (`components/CartoonCard.tsx`)
- All major content containers, modals, and primary action buttons **MUST** feature a 3D extruded bottom border (`border-2 ... border-b-4 ...`).
- **Color Pairing Rule**: When changing the background of a card/button, **ALWAYS pair it with its corresponding darker extruded bottom border**:
  - **Standard Card**: `bg-bg-card border-border-card border-b-border-card-dark`
  - **Subtle Highlight**: `bg-coral-subtle border-border-card border-b-border-card-dark`
  - **Primary Accent / Action**: `bg-primary border-primary-light border-b-primary-dark`
  - **Income / Inflows**: `bg-emerald-subtle border-emerald-border border-b-emerald-border-dark` (or `bg-emerald border-emerald-light border-b-emerald-dark` for solid badges)
  - **Expense / Outflows**: `bg-rose-subtle border-rose-border border-b-rose-border-dark` (or `bg-rose border-rose-light border-b-rose-dark` for solid badges)
  - **Streak / Milestones**: `bg-gold-subtle border-gold-border border-b-gold-border-dark` (or `bg-gold border-gold-light border-b-gold-dark` for solid badges)
- Use [`<CartoonCard variant="...">`](./components/CartoonCard.tsx) for uniform rendering of these variants across screens.

### 2. Flat Internal Elements vs. Chunky Containers
- Keep nested icon badges, avatars, and progress tracks **flat and clean** (`bg-coral-subtle rounded-2xl` / `bg-bg-app rounded-full`) so the cards feel light and modern rather than visually cluttered.
- Progress bars must maintain smooth single-tone fills without unnecessary beveling.

### 3. Bold Gamified Typography
- Use extra-bold and black font weights (`font-black` for headers/amounts/badges, `font-bold` for secondary labels) to match the punchy cartoony feel.

---

## 📐 Layout & Ergonomics Guidelines

1. **Routing Structure**: Expo Router (`app/` directory structure with `(tabs)` layout and modal stacks).
2. **Safe Area Insets & Layout Wrappers**:
   - **MUST USE**: ALL screens, modals, custom headers, and tab bars **MUST** consume `useSafeAreaInsets()` from `react-native-safe-area-context`.
   - **DYNAMIC PADDING**: Always apply dynamic safe-padding using `Math.max()` to handle both low-end devices and devices with notches/dynamic islands:
     - Top padding: `paddingTop: Math.max(insets.top, 16)`
     - Bottom scroll content padding: `contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) }}`
   - **FORBIDDEN**: AI agents must **NEVER** use `<SafeAreaView>` wrapper components (from `react-native` or `react-native-safe-area-context`) or hardcoded fixed paddings (e.g. `paddingBottom: 40`, `pt-4`) for root screen layouts.
   - **Full-Bleed Hero Sections**: Do not wrap full-bleed hero headers in an outer inset-padded container. Instead, set the hero container to full width (`w-full bg-primary`) and apply `paddingTop: Math.max(insets.top, 16)` directly to the hero view to ensure seamless status bar and notch integration across iOS dynamic islands and Android edge-to-edge displays.
3. **Speedometer & Arc Gauges**:
   - Build lightweight, high-performance semi-circular gauges using geometric styling (radius, center-point calculations, glowing knob indicator, and radial tick marks) referencing overlay tokens (`colors.whiteOverlay20`, `colors.white`, etc.) without introducing heavy external binaries.
4. **NativeWind v4 Dynamic ClassNames (`will-change-variable`)**:
   - Whenever dynamic JSX classNames conditionally toggle background, text, or shadow theme variables (e.g. `${isActive ? "bg-bg-card shadow-sm" : "bg-transparent"}` or `${type === "income" ? "bg-primary" : "bg-transparent"}`), **MUST prefix the className string with `will-change-variable`**.
   - This informs `react-native-css-interop` to pre-allocate variable slots on initial render, preventing unexpected component state resets, re-mount warnings (`ReactNativeCss`), and UI flickers.
5. **Visual Hierarchy & Polish**:
   - Soft rounded corners (`rounded-3xl` / `rounded-2xl` / `rounded-b-[36px]`).
   - High-contrast financial typography, trend indicators with directional arrows (`↑` / `↓`), and tactile pill filters.
6. **Performance**: 0ms latency UI updates using optimistic local mutations before background synchronization.