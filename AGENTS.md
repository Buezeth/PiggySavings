# AGENTS.md - PiggySavings Rules & Architecture Guidelines

> [!IMPORTANT]
> **Expo HAS CHANGED**: Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

---

## 💡 Project Identity & Product Requirements

PiggySavings is a smart personal finance, goal-oriented savings, and budgeting mobile application built with **React Native (Expo Router)**, **NativeWind v4 (TailwindCSS)**, **Clerk Authentication**, **Supabase (PostgreSQL/RLS)**, and an **Offline-First SQLite Engine**.

All agentic decisions, component implementations, schemas, and features **MUST** strictly adhere to the technical specifications defined below and in the core project documentation.

---

## 🏗️ System Architecture: Clerk + Supabase + Offline SQLite

                       ┌──────────────────────────────┐
                       │     Guest User (Offline)     │
                       │  • Local SQLite Storage      │
                       │  • expo-secure-store UUID    │
                       └──────────────┬───────────────┘
                                      │
                         (User taps "Back up to Cloud")
                                      │
                                      ▼
                       ┌──────────────────────────────┐
                       │     Clerk Auth (Sign Up)     │
                       │  • Issues JWT Token          │
                       │  • Sub claim = Clerk User ID │
                       └──────────────┬───────────────┘
                                      │
                               (Authenticated)
                                      ▼
                       ┌──────────────────────────────┐
                       │      Supabase PostgreSQL     │
                       │  • RLS scoped to Clerk `sub` │
                       │  • RPC: `claim_guest_data()` │
                       │  • 2-Way Delta Sync Outbox   │
                       └──────────────────────────────┘


---

## 📑 Core Functional Specifications

### 1. Guest Mode & Optional Sign-Up (Zero Friction Onboarding)
- **First Launch**: The app must never block the user with a mandatory login screen. Generate a persistent local Guest UUID in `expo-secure-store` and create a local record with `is_guest = 1`.
- **Local Persistence**: All transactions, goals, recurring schedules, and auto-allocation rules must function 100% offline using `expo-sqlite`.
- **Account Claiming & Migration**: When a guest signs up via Clerk:
  1. Authenticate with Clerk and obtain a Supabase-compatible JWT token.
  2. Invoke Supabase RPC `claim_guest_data(payload)` with all local SQLite tables inside an atomic transaction.
  3. Update local SQLite state to `is_guest = 0`, bind the Clerk `user_id`, mark outbox records as synced, and activate the cloud 2-way delta sync.

### 2. Scheduled Recurring Transactions & Savings Automation
- **Database Entity**: `recurring_schedules` (supporting `daily`, `weekly`, `bi_weekly`, `custom_days` [e.g. every 15 days for paychecks], and `monthly`).
- **Hybrid Execution Engine**:
  - **Local (Guest/Offline)**: On app launch or foreground resume (`AppState`), query `next_occurrence <= date('now')`, insert transaction entries, compute next due date, and trigger the Goal Auto-Allocation Engine.
  - **Cloud (Registered)**: Server-side cron/worker processes due occurrences and dispatches celebratory push notifications.
- **Pay Yourself First (Auto-Allocation)**: Incoming paychecks automatically distribute funds across active goals based on configured percentages or fixed amounts, strictly respecting remaining goal caps to prevent over-saving.

### 3. Monetization Strategy: 3-Goal Limit + Rewarded Ads & Supporter Tip Jar
- **Free Tier Limits**: Max **3 Active Goals** simultaneously.
- **Goal Limit Interceptor**: If an un-entitled user attempts to create a 4th goal, display `<GoalLimitModal />`:
  - **Option A (Rewarded Ad)**: Watch a short video ad to unlock $+1$ goal slot (`unlocked_goal_slots += 1`).
  - **Option B (Supporter Tip Jar)**: One-time tip ($1.99, $4.99, $9.99) via In-App Purchase to unlock permanent **Unlimited Goals**, custom badges, and remove ad prompts.
- All core budgeting, recurring transaction automation, insights, and offline logging remain **100% free and un-gated**.

### 4. Data Model & Atomic Financial Calculations
- **Integer Cents Precision**: **NEVER** use standard floating-point numbers for money. All transaction amounts, goal targets, and balances **MUST** be stored as integer cents (`amount_cents INTEGER`, e.g., $10.50 stored as `1050`).
- **Delta Event Logging Strategy**: Goal balances must **NEVER** be updated by overwriting absolute totals during sync. Always log and transmit delta increments (`+delta_cents` / `-delta_cents`) to prevent multi-device race condition overwrites.
- **Idempotency**: Always attach a client-generated UUID v4 `idempotency_key` to offline and online transaction creations.

### 5. Security & Privacy Architecture
- Local authentication via `expo-local-authentication` (Biometrics / FaceID / Fingerprint).
- Sensitive tokens and guest identifiers stored in `expo-secure-store`.
- Row-Level Security (RLS) on all Supabase tables scoped to `(auth.jwt() ->> 'sub')::text`.

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

PiggySavings embraces a vibrant, tactile, gamified aesthetic designed to make saving feel playful and rewarding:

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
   - **Full-Bleed Hero Sections**: Do not wrap full-bleed hero headers in an outer inset-padded container. Set the hero container to full width (`w-full bg-primary`) and apply `paddingTop: Math.max(insets.top, 16)` directly to the hero view.
3. **NativeWind v4 Dynamic ClassNames (`will-change-variable`)**:
   - Whenever dynamic JSX classNames conditionally toggle background, text, or shadow theme variables (e.g. `${isActive ? "bg-bg-card shadow-sm" : "bg-transparent"}` or `${type === "income" ? "bg-primary" : "bg-transparent"}`), **MUST prefix the className string with `will-change-variable`**.
4. **Performance**: 0ms latency UI updates using optimistic local SQLite mutations before background synchronization.