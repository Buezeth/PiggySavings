# AGENTS.md - PiggySavings Rules & Architecture Guidelines

> [!IMPORTANT]
> **Expo HAS CHANGED**: Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

---

## 💡 Project Identity & Product Requirements

PiggySavings is a smart personal finance, goal-oriented savings, and budgeting mobile application built with **React Native (Expo Router)**, **NativeWind v4 (TailwindCSS)**, and modern mobile architectural practices.

All agentic decisions, component implementations, schemas, and features **MUST** strictly adhere to the technical specifications defined in the core project documentation (`C:\Users\CT_DEVS\Documents\HTML_CSS_NOTES\PiggySavings\Functionalities`).

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

## 🎨 UI/UX & Design Guidelines

> [!IMPORTANT]
> **STRICT THEME ADHERENCE REQUIREMENT**:
> Whenever building or modifying UI screens, components, or styles, AI agents **MUST ALWAYS reference and use the central design theme tokens** defined in [`global.css`](file:///c:/Users/CT_DEVS/Documents/Projects/PiggySavings/global.css). Do NOT hardcode arbitrary colors when building core app screens.

### Design Theme Tokens & Styling Rules
1. **Routing**: Expo Router (`app/` directory structure with `(tabs)` layout).
2. **Styling Engine**: NativeWind v4 with TailwindCSS utility classes. Global stylesheet imported via `@/global.css` or `../global.css`.
3. **Color Palette Theme (Warm Sunset Coral & Cream UI)**:
   - **App Background (`bg-bg-app` / `#FAF4F0`)**: Soft warm off-white / light cream tone.
   - **Primary Action Accent (`bg-primary` / `#EE6A3B`, `bg-primary-dark` / `#D45427`)**: Vibrant sunset orange/coral hero cards & primary buttons.
   - **Card Backgrounds (`bg-bg-card` / `#FFFFFF`, `bg-bg-accent` / `#E35D31`)**: Crisp white rounded containers or coral highlight cards.
   - **Text Colors**:
     - Dark Cocoa / Primary text: `text-text-main` (`#331C14`)
     - Muted Subtitles: `text-text-muted` (`#8C7B75`)
     - Brand Header text: `text-text-brand` (`#A83B1B`)
   - **Accents**:
     - Savings indicator gold: `bg-gold` / `text-gold` (`#F5B800`)
     - Subtle coral pill backgrounds: `bg-coral-subtle` (`#FDF3EF`)
4. **Visual Polish & Aesthetics**:
   - Soft rounded cards (`rounded-3xl` / `rounded-2xl`), smooth progress semi-circles/gauges, clean typography hierarchy, subtle pill badges, and high-contrast readable financial figures.
5. **Performance**: 0ms latency UI updates using optimistic local mutations before syncing in background.
