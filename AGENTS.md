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
- Gauge & Translucent Overlays:
  - `bg-white-overlay-10` (`rgba(255, 255, 255, 0.1)`)
  - `bg-white-overlay-20` (`rgba(255, 255, 255, 0.2)`)
  - `bg-white-overlay-30` (`rgba(255, 255, 255, 0.3)`)
  - `bg-white-overlay-40` (`rgba(255, 255, 255, 0.4)`)
  - `bg-white-overlay-80` (`rgba(255, 255, 255, 0.8)`)
- State & Success Badges: `bg-trend-up-bg` / `bg-emerald-subtle` (`#ECFDF5`), `bg-gold` (`#F5B800`)

#### 2. Text Tokens
- Primary cocoa body / numbers: `text-text-main` (`#331C14`)
- Subtitles & muted labels: `text-text-muted` (`#8C7B75`)
- Brand header accents: `text-text-brand` (`#A83B1B`)
- Primary brand text: `text-primary` (`#EE6A3B`)
- Savings indicators & milestones: `text-gold` (`#F5B800`)
- Trends & Success metrics: `text-trend-up` / `text-emerald` (`#10B981`)
- Light text on brand surfaces: `text-white` (`#FFFFFF`), `text-white-overlay-80` (`rgba(255, 255, 255, 0.8)`)

#### 3. Border & Divider Tokens
- Standard card borders: `border-border-card` (`#F3ECE7`)
- Primary brand borders: `border-primary` (`#EE6A3B`)
- Translucent hero borders: `border-white-overlay-10`, `border-white-overlay-20`

#### 4. Shadow Tokens
- Primary glow: `shadow-primary/20`, `shadow-primary/25`, `shadow-primary/35`
- Elevation: `shadow-sm`, `shadow-md`, `shadow-lg`

---

## 📐 Layout & Ergonomics Guidelines

1. **Routing Structure**: Expo Router (`app/` directory structure with `(tabs)` layout and modal stacks).
2. **Safe Area Insets**:
   - ALL screens, modals, custom headers, and tab bars **MUST** consume `useSafeAreaInsets()` from `react-native-safe-area-context`.
   - Apply dynamic safe-padding (`paddingTop: Math.max(insets.top, 16)`, `paddingBottom: Math.max(insets.bottom, 16)`).
   - **Full-Bleed Hero Sections**: Do not wrap full-bleed hero headers in an outer inset-padded container. Instead, set the hero container to full width (`w-full bg-primary`) and apply `paddingTop: Math.max(insets.top, 16)` directly to the hero view to ensure seamless status bar and notch integration across iOS dynamic islands and Android edge-to-edge displays.
3. **Speedometer & Arc Gauges**:
   - Build lightweight, high-performance semi-circular gauges using geometric styling (radius, center-point calculations, glowing knob indicator, and radial tick marks) referencing overlay tokens (`colors.whiteOverlay20`, `colors.white`, etc.) without introducing heavy external binaries.
4. **Visual Hierarchy & Polish**:
   - Soft rounded corners (`rounded-3xl` / `rounded-2xl` / `rounded-b-[36px]`).
   - Clean 3-column docked metric cards with dividers.
   - High-contrast financial typography, trend indicators with directional arrows (`↑` / `↓`), and pill filters.
5. **Performance**: 0ms latency UI updates using optimistic local mutations before background synchronization.