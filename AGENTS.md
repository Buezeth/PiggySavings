# AGENTS.md - PiggySavings Rules & Architecture Guidelines

> [!IMPORTANT]
> **Expo HAS CHANGED**: Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

---

## 💡 Project Identity & Product Requirements

PiggySavings is a privacy-first, goal-oriented personal finance and smart budgeting mobile application built with **React Native (Expo Router)**, **NativeWind v4 (TailwindCSS)**, and a **100% Zero-Backend, Local-First Architecture** (`expo-sqlite` + `expo-secure-store`).

There are **zero hosted server databases and zero mandatory account creation requirements**. Users retain 100% ownership of their financial data, backed up directly to their personal cloud storage (Google Drive AppData / iCloud / encrypted local file export).

The app combines **Category Envelope Budgeting**, **Smart Savings Goals (Pay-Yourself-First)**, **Scheduled Recurring Automation**, and **Tactile Gamification** (Duolingo-style 3D aesthetics) into a unified financial hub.

All agentic decisions, component implementations, schemas, and features **MUST** strictly adhere to the technical specifications defined below.

---

## 🏗️ Zero-Backend System Architecture (Local-First + Personal Cloud)

```text
                       ┌──────────────────────────────┐
                       │     Local-First Device       │
                       │  • expo-sqlite DB (Schema v3)│
                       │  • expo-secure-store Tokens  │
                       │  • On-Device Recurring Engine│
                       │  • Category Spending Envelopes│
                       │  • Local Notification Nudges │
                       └──────────────┬───────────────┘
                                      │
                         (Backup & Restore Actions)
                                      │
                 ┌────────────────────┼────────────────────┐
                 ▼                    ▼                    ▼
     [ Google Drive AppData ]   [ iCloud / iOS Files ]   [ Encrypted File Export ]
     • Hidden app data folder   • Private App Container  • .piggysave / JSON bundle
     • Zero server costs        • Native iOS sync        • Share via AirDrop/Email
```

---

## 📑 Core Functional Specifications

### 1. Zero-Backend & Accountless Privacy Architecture
- **Zero Mandatory Sign-Up**: The app opens directly to the dashboard with 0ms latency. No email, password, or third-party server account is required.
- **Local SQLite Engine (`expo-sqlite`)**: All financial ledgers, category budgets, savings goals, recurring rules, and entitlement metadata reside exclusively on the user's physical device.
- **Personal Cloud Backup & Restore**:
  - **Google Drive (`appDataFolder`)**: Backs up encrypted database snapshots directly to the user's hidden Google Drive application folder (completely private and isolated from accidental deletion).
  - **Encrypted File Export / Import**: Users can export or import their `.piggysave` / `.json` backup file anytime via `expo-sharing` and `expo-document-picker`.

### 2. Dual-Core Budgeting, Envelopes & Mental Accounting
- **Category Spending Envelopes**:
  - Every expense category supports an optional monthly limit (`monthly_budget_cents INTEGER DEFAULT NULL`).
  - The UI tracks real-time monthly pacing (`Spent / Budget`) with progressive color states:
    - `< 75%` ➔ `text-emerald` / `bg-emerald-subtle`
    - `75%–99%` ➔ `text-gold-dark` / `bg-gold-subtle`
    - `≥ 100%` ➔ `text-rose` / `bg-rose-subtle` with explicit overspending warnings.
- **Spendable Cash vs. Goal-Reserved Separation**:
  - `Raw Cashflow = Total Income - Total Expenses`.
  - `Spendable Balance = Total Income - Total Expenses - Active Goal Balances`.
  - The app must **never** mislead the user into believing money locked in savings goals is free unallocated cash available to spend.
- **Bi-Directional Goal Flow**:
  - **Inflow (Partial Allocations)**: When logging income, users can split allocations to active goals using presets (`10%`, `20%`, `50%`, `100%`, or custom amounts) rather than forcing 100% of the transaction amount.
  - **Outflow (Goal Realization & Withdrawals)**: When an expense is funded by a savings goal (e.g. buying flights saved under "Japan Trip"), the transaction references `source_goal_id`, deducting from that goal's balance while categorizing the expense.

### 3. Transaction Lifecycle & Reversible Mutations
- **Full CRUD & Interactivity**: Every transaction in the ledger can be viewed in detail, edited, or deleted.
- **Atomic Deletion / Edit Rollbacks**:
  - Deleting an income transaction that funded a goal must atomically deduct that amount from the goal's `current_amount_cents` and purge the linked `goal_contributions` audit entry.
  - Deleting an expense funded by a goal (`source_goal_id`) must atomically restore those funds back to the goal's `current_amount_cents`.
  - All balance reconciliations must occur in an atomic SQLite transaction (`runInExclusiveTransaction`).

### 4. Scheduled Recurring Transactions & Safe Review Queue
- **Local Engine (`services/recurring/recurringEngine.ts`)**:
  - Runs on app launch and foreground resume (`AppState.addEventListener`).
  - Evaluates `recurring_schedules` where `next_occurrence <= date('now')` and `is_active = 1`.
  - Automatically records fixed salary paychecks, subscriptions, and rent, or flags variable recurring bills (e.g. utilities) in a **Review Queue** so users can adjust amounts before writing to the ledger.
  - Computes the next occurrence interval (e.g. every 15 days, monthly, weekly).
- **Pay Yourself First (Auto-Allocation Engine)**:
  - When an incoming paycheck is logged, `services/allocation/allocationEngine.ts` calculates rule splits (percentage or fixed amounts) and routes savings to active goals.
  - Respects remaining goal balance caps to prevent over-saving. Automatically updates goal status to `'completed'` when target is met, and back to `'active'` if funds are withdrawn.

### 5. Monetization Strategy: 3-Goal Limit + Rewarded Ads & Supporter Tip Jar
- **Free Tier Limits**: Max **3 Active Goals** simultaneously.
- **Goal Limit Interceptor**: If an un-entitled user attempts to create a 4th goal, display `<GoalLimitModal />`:
  - **Option A (Rewarded Ad)**: Watch a short video ad to unlock $+1$ goal slot (`unlocked_goal_slots += 1`).
  - **Option B (Supporter Tip Jar)**: One-time tip ($1.99, $4.99, $9.99) via In-App Purchase to unlock permanent **Unlimited Goals**, custom badges, and remove all ad prompts.
- All core budgeting tools, category envelopes, recurring transaction automation, analytics, insights, and offline capabilities remain **100% free and un-gated forever**.

### 6. Data Model & Atomic Financial Calculations
- **Integer Cents Precision**: **NEVER** use standard floating-point numbers for money. All transaction amounts, goal targets, category budgets, and balances **MUST** be stored as integer cents (`amount_cents INTEGER`, e.g., $10.50 stored as `1050`).
- **Dynamic Multi-Currency Formatting**:
  - **FORBIDDEN**: AI agents must **NEVER** hardcode dollar signs (e.g. `"$"` or `+$${...}`) in JSX labels or text templates.
  - All currency rendering **MUST** consume dynamic formatting from `useApp()` (`formatMoney(cents, options)`) or `currencySymbol` to respect the user's chosen display currency (stored in `user_preferences.preferred_currency`).
- **Atomic Balance Updates & Bundled Mutations**:
  - Goal balances, category budgets, transaction entries, and associated recurring schedules must always execute within atomic database transactions (`runInExclusiveTransaction` / `db.withTransactionAsync`) to guarantee ACID compliance.
  - Multi-entity workflows (e.g. logging a transaction + goal allocation + recurring schedule) must be committed in a single database transaction so that a failure in one operation never leaves orphaned records.
- **Client Idempotency & Re-entrancy Protection**:
  - Attach client UUID v4 `idempotency_key` to all transaction and contribution creations to prevent double insertions.
  - Form submissions and mutation handlers **MUST** use synchronous `useRef` guards (e.g., `isSubmittingRef.current`) to immediately reject duplicate / rapid multi-tap submissions, reliably releasing the guard in `finally` blocks across all completion paths.
- **State Race Condition & Mutation Revision Tracking**:
  - Central reactive contexts (e.g., `AppContext`) must maintain monotonically increasing generation and mutation revision refs (e.g., `refreshGenerationRef`, `recurringMutationRevisionRef`).
  - Capture snapshot revisions at query dispatch and verify that local optimistic mutations are not overwritten by stale asynchronous `refreshData` results.

### 7. Analytics & Projection Integrity
- **Signed Velocity Calculations**: Financial velocity metrics (e.g., 30-day net cashflow) must compute the true signed difference (`income - expenses`). Never clamp the underlying metric to zero; clamp only the visual width of progress bars (`Math.max(0, ...)`).
- **Dynamic Velocity Benchmarks**: Calculate progress bar scaling dynamically based on the user's monthly income or annual goal targets (`Math.max(monthlyIncome, totalGoalTargets / 12, 50000)`). **NEVER** hardcode a static $1,000 baseline (which breaks zero-decimal currencies like JPY/KRW).
- **Goal-Specific Completion Projections**: Projections for individual goals (e.g., days remaining estimates) must be derived from contributions specific to that goal rather than global app cashflow.
- **Dynamic Trend & Pace States**:
  - Derive trend directions (`"up" | "down" | "neutral"`) from computed numerical thresholds rather than hardcoded positive assumptions.
  - Provide explicit status indicators (e.g., `hasPace: boolean`, `paceLabel`) covering all states including empty history, completed goals, and zero-velocity periods.
- **Calendar-Day Date Comparisons**:
  - Always validate timestamps (`!isNaN(d.getTime())`) before formatting.
  - Group and compare dates using calendar year/month/date boundaries instead of elapsed-millisecond division to ensure correct "Today" and "Yesterday" labeling across midnight boundaries.

### 8. On-Device Push Notifications & Behavioral Nudges
- **100% Local Scheduling (`expo-notifications`)**: No remote push servers.
- Schedules daily logging reminders, weekly progress summaries, category budget threshold alerts (75%, 100%), milestone celebrations (25%, 50%, 75%, 100%), and streak nudges directly on the operating system's local notification daemon.

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
  - `bg-white-overlay-70` (`rgba(255, 255, 255, 0.7)`)
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

PiggySavings embraces a vibrant, tactile, gamified aesthetic designed to make saving and budgeting feel playful and rewarding:

### 1. Extruded 3D Cards & Buttons (`components/CartoonCard.tsx`)
- All major content containers, modals, sheets, and primary action buttons **MUST** feature a 3D extruded bottom border (`border-2 ... border-b-4 ...`) using `<CartoonCard>`.
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
   - **Full-Bleed Hero Sections**: Do not wrap full-bleed hero headers in an outer inset-padded container. Set the hero container to full width (`w-full bg-primary`) and apply `paddingTop: Math.max(insets.top, 16)` directly to the hero view.
3. **Keyboard Visibility & Form Usability**:
   - Wrap modal/screen form inputs in `<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>` so inputs and submit buttons remain visible when the virtual keyboard is displayed.
4. **NativeWind v4 Dynamic ClassNames (`will-change-variable`)**:
   - Whenever dynamic JSX classNames conditionally toggle background, text, or shadow theme variables (e.g. `${isActive ? "bg-bg-card shadow-sm" : "bg-transparent"}` or `${type === "income" ? "bg-primary" : "bg-transparent"}`), **MUST prefix the className string with `will-change-variable`**.
5. **Transparency & Honesty in Action Feedback**:
   - Never show simulated success alerts for features that are stubbed or pending full delivery (e.g. cloud sync, file export). Instead, accurately inform the user of the current status or disable the interaction.
1. **Performance**: 0ms latency UI updates using local SQLite queries and optimistic state updates.