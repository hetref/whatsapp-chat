# WaChat Design System & Architectural Specification (`design.md`)

> **Single Source of Truth** for UI/UX engineering, component development, visual hierarchy, color calibration, and design consistency across the WaChat platform.

---

## 1. Visual Atmosphere & Philosophy

### A. The Core Vibe: "Editorial Botanical & Calm Sovereign SaaS"
WaChat rejects both generic cold SaaS dashboards and the loud neon-gradient "AI hype" aesthetic. It embraces an **Editorial Botanical** design language:
- **Calm, High-Agency Aura**: Feels like reading a prestigious architectural or literary journal (such as *Kinfolk* or *Cereal*) fused with the precision of high-end software like *Linear* or *Raycast*.
- **Tactile Organic Surfaces**: Warm parchment (`#FAF8F5`) and sandstone (`#F4F1EB`) foundations rather than sterile `#FFFFFF` or stark `#000000`.
- **Botanical Forest Accents**: Deep evergreen tones (`#2D583F`) and calm sage (`#5F7C65`) replace harsh WhatsApp neon greens (`#25D366`).
- **Spatial Rhythm**: Generous macro-whitespace, strict visual hierarchy, zero visual clutter, and intentional micro-typography.

### B. Taste Spectrum Calibration
- **Density:** Balanced (5/10) — comfortable breathing room in marketing pages; structured, focused density in workspace tools.
- **Variance:** Offset Asymmetric (6/10) — clean structured grids paired with editorial italic serif accents and asymmetric bento layouts.
- **Motion:** Weighted Kinetic Fluidity (6/10) — smooth spring physics, zero abrupt state cuts, perpetual tactile hover states.

---

## 2. Color Palette & Semantic Tokens

### A. Surface Neutrals (Light & Dark Mode)
| Token | Hex (Light) | Hex (Dark) | Role & Usage |
|---|---|---|---|
| `--surface-canvas` | `#FAF8F5` | `#0C0F0D` | Primary page canvas background (Parchment / Deep Obsidian) |
| `--surface-subtle` | `#F4F1EB` | `#131915` | Secondary section background, stats strips, sidebar track |
| `--surface-card` | `rgba(255, 255, 255, 0.85)` | `#18201B` | Card containers, modals, message panels, backdrop blur |
| `--surface-elevated`| `#FFFFFF` | `#202A24` | Floating menus, dropdowns, active popovers |

### B. Botanical Brand Palette
| Token | Hex Code | Role & Usage |
|---|---|---|
| `--color-botanical-sage` | `#5F7C65` | **Primary Brand Action** — Main CTA buttons, active indicators, brand logo mark |
| `--color-botanical-hover`| `#526D57` | **Hover State** — Subtle darkening for active button feedback |
| `--color-botanical-deep` | `#2D583F` | **Evergreen Accent** — Editorial italic headlines, highlighted badges, high-contrast text |
| `--color-botanical-forest`| `#062E1E` | **Deep Forest** — Display headline contrast text (`text-emerald-950`) |
| `--color-botanical-tint` | `rgba(95, 124, 101, 0.12)` | Subtle pill washes, active navigation item backgrounds |

### C. Typography & Content Neutrals (Stone Scale)
| Token | Hex Code | Tailwind Equivalent | Role |
|---|---|---|---|
| `--text-primary` | `#1C1917` | `text-stone-900` / `text-stone-100` | Primary headings, titles, strong labels |
| `--text-secondary` | `#44403C` | `text-stone-700` / `text-stone-300` | Body copy, descriptions, navigation links |
| `--text-muted` | `#78716C` | `text-stone-500` / `text-stone-400` | Timestamps, metadata, hints, disabled labels |
| `--border-hairline` | `rgba(231, 229, 228, 0.80)` | `border-stone-200/80` / `border-stone-800/80` | Subtle hairline borders, card edges |
| `--border-accent` | `rgba(95, 124, 101, 0.25)` | `border-[#5F7C65]/25` | Active item outlines, card hover borders |

### D. Semantic Status Colors
- **Success / Online**: `#2D583F` (Deep Botanical Green) with `rgba(45, 88, 63, 0.12)` background.
- **Warning / Tier Limit**: `#D97706` (Warm Honey Amber) — calm warning, never glaring hazard yellow.
- **Destructive / Error**: `#B91C1C` (Rust Crimson) with `rgba(185, 28, 28, 0.08)` background.
- **Info / Blue Accent**: `#2563EB` (Quiet Slate Blue) for deep links.

### E. Strict Anti-Palette (NEVER Use)
1. **Generic WhatsApp Neon Green (`#25D366` / `#128C7E`)**: Strictly forbidden on dashboard, landing, and primary buttons. Use Botanical Sage `#5F7C65` and Evergreen `#2D583F`.
2. **AI Purple / Cyan Neon (`#8B5CF6`, `#06B6D4`)**: Strictly banned. No purple glowing borders or holographic gradients.
3. **Pure Black (`#000000`)**: Always use Deep Forest `#062E1E`, Off-Black `#0C0F0D`, or Stone-950 `#0C0A09`.
4. **Harsh Red Badges (`#FF0000`)**: Replace with Rust Crimson `#B91C1C` or muted terracotta.

---

## 3. Typographic Architecture

### A. Font Pairing
- **Primary Geometric Sans**: `Geist` (`font-sans`)
  - Used for interface labels, navigation, buttons, numbers, data tables, chat messages, and body copy.
  - Characterized by razor-sharp geometric neutrality and high legibility at small sizes.
- **Editorial Variable Serif**: `Georgia, serif` or modern editorial serifs (`Editorial New`, `Fraunces`)
  - Used **only** as an accent font for selective italic words inside prominent headlines (e.g., *"When <span className="font-[Georgia,serif] italic text-[#2D583F]">You Connect</span>"*).
  - Never used for raw body text, form inputs, buttons, or technical metrics.
- **Tabular Figures & Numbers**: `font-mono` / tabular digits for timestamps, countdowns, phone numbers, and usage quotas.

### B. Scale & Tracking Rules
| Level | Font Size | Line Height | Tracking | Weight |
|---|---|---|---|---|
| **Display (Hero H1)** | `clamp(2.5rem, 4.4vw, 4.65rem)` | `1.08` | `tracking-[-0.055em]` | Normal (400) + Italic Serif Accent |
| **Section H2** | `clamp(1.875rem, 3vw, 3rem)` | `1.15` | `tracking-[-0.04em]` | SemiBold (600) / Normal |
| **Card Title H3** | `1.25rem` (20px) | `1.35` | `tracking-[-0.025em]` | SemiBold (600) |
| **Body Large** | `1.125rem` (18px) | `1.5` | `normal` | Normal (400) |
| **Body Default** | `0.875rem` (14px) | `1.5` | `normal` | Normal (400) / Medium (500) |
| **Micro Labels** | `0.75rem` (12px) | `1.3` | `tracking-wider` | SemiBold (600) (Uppercase for tags) |

---

## 4. Component Design Patterns

### A. Tactile "Beveled Pill" Buttons
Buttons are not flat colored blocks; they have physical presence and tactile weight:
```tsx
// Primary Brand CTA
className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#5F7C65] hover:bg-[#526D57] px-5 py-2.5 text-sm font-medium text-white shadow-[inset_0_2px_4px_0_rgba(255,255,255,0.2),inset_0_-2px_4px_0_rgba(0,0,0,0.18)] outline outline-black/10 transition-all duration-200 active:scale-[0.97]"
```
- **Trailing Icon Animation**: If an arrow (`↗` or `→`) is present, it smoothly translates on hover (`group-hover:translate-x-0.5 group-hover:-translate-y-0.5`).
- **Secondary Button**: Outlined in `border-stone-300 dark:border-stone-700 bg-white/60 dark:bg-stone-900/60 hover:bg-stone-100 text-stone-900`.

### B. Double-Bezel Containers (Doppelrand Architecture)
Important cards (such as pricing cards, feature cards, and dialogs) feature concentric nested enclosures:
- **Outer Shell**: Subtle parchment or stone tint `border border-stone-200/80 bg-white/70 backdrop-blur-md p-1.5 rounded-2xl`.
- **Inner Core**: Inner content container with concentric radius `rounded-[calc(1rem-0.25rem)] bg-white dark:bg-stone-900/90 p-6 shadow-xs`.

### C. Eyebrow Tags & Badges
Precede major headings or mark categories with micro pill badges:
```tsx
className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20"
```

### D. Interactive Message Reaction Badges
As implemented in the chat window:
- Pill shape with subtle border: `inline-flex items-center gap-1 px-2.5 py-0.5 text-xs rounded-full border shadow-2xs transition-all hover:scale-105 active:scale-95`.
- Single reaction shows clean emoji `{reaction.emoji}`. Multiple reactions show `{reaction.emoji} {reaction.count}`.
- Hover tooltip shows complete sender attribution (`Aryan Shinde reacted with 🥳`).

---

## 5. Sidebar & Navigation Architecture (`/protected`)

The sidebar is the persistent visual anchor for the application. It must embody the Editorial Botanical theme seamlessly:

### A. Layout Structure & Header
- **Background**: Soft parchment canvas `bg-[#FAF8F5] dark:bg-[#0E1310] border-r border-stone-200/80 dark:border-stone-800/80`.
- **Header**:
  - Uses the official `LogoIcon` (`@/components/logo-icon`) in Botanical Sage (`#5F7C65`).
  - Brand name "WaChat" rendered in `font-semibold text-lg tracking-[-0.035em] text-stone-900 dark:text-stone-100`.
  - In collapsed mode, `LogoIcon` is neatly centered.

### B. Navigation Items
- **Active State**:
  - Subtle sage-tinted wash: `bg-[#5F7C65]/12 dark:bg-[#5F7C65]/20 text-[#2D583F] dark:text-[#8EAE95] font-semibold border border-[#5F7C65]/25 shadow-2xs rounded-xl`.
  - Icon highlighted in `#2D583F` / `#8EAE95`.
- **Inactive State**:
  - `text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/50 dark:hover:bg-stone-800/40 rounded-xl transition-all duration-150`.
- **Locked Feature Badge**:
  - Gated features (`bulkSend`, `apiAccess`) display an unobtrusive lock pill badge (`Lock className="size-3 text-stone-400"`).

### C. Quota & Usage Indicators
- Clean progress meters using Botanical Sage fill:
  - Track: `bg-stone-200/70 dark:bg-stone-800/80 h-1.5 rounded-full overflow-hidden`.
  - Indicator: `bg-[#5F7C65] h-full rounded-full transition-all duration-300`.
  - If limit > 90%, softly transitions to warm amber `#D97706` (warning) rather than harsh red.
- Clean metrics: `2/10 Contacts`, `0 B/5 GB Storage` in `text-xs font-medium text-stone-600 dark:text-stone-400`.

### D. User Account & Sign Out Footer
- **Profile Area**:
  - Clean card container with Clerk `UserButton`.
  - Plan Badge: Soft organic pill (`Free` in sage-tinted pill, `Silver` in slate, `Gold` in warm amber).
- **Sign Out Button**:
  - Quiet, refined outline button with subtle hover feedback:
  - `text-stone-600 dark:text-stone-400 hover:text-red-700 dark:hover:text-red-400 border border-stone-200/80 dark:border-stone-800 hover:bg-red-50/50 dark:hover:bg-red-950/20 rounded-xl`.
- **Floating Collapse Toggle**:
  - Tactile circular pill on the border with smooth chevron rotation.

### E. Internal Settings & Workspace Configuration Pages (`/protected/setup`, `/protected/api-keys`, etc.)

Internal configuration pages must maintain identical aesthetic harmony with the rest of the sovereign SaaS platform:

1. **Page Canvas & Header Architecture**:
   - Background: `bg-[#FAF8F5]/50 dark:bg-[#0C0F0D]` flowing naturally from the layout.
   - Width: **Full-width layouts** (`w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-16`) rather than restrictive boxed `max-w-5xl` wrappers. Avoid dead side margins on widescreen monitors.
   - Eyebrow Badge: Pill with `LogoIcon` (`bg-[#5F7C65]/10 text-[#2D583F] dark:text-[#8EAE95] border border-[#5F7C65]/20`).
   - Headline: `text-2xl sm:text-3xl font-semibold tracking-[-0.035em] text-stone-900 dark:text-stone-100` featuring selective `font-[Georgia,serif] italic font-normal text-[#2D583F] dark:text-[#8EAE95]` accents.
   - Subtitle: `text-stone-600 dark:text-stone-400 text-sm sm:text-base mt-1.5 max-w-2xl leading-relaxed`.

2. **Status Enclosures (Doppelrand Architecture)**:
   - Primary status containers feature nested concentric geometry: outer shell `rounded-2xl border border-stone-200/80 dark:border-stone-800/80 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md p-1.5 shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)]`, inner core `rounded-[calc(1rem-0.125rem)] bg-[#FAF8F5]/80 dark:bg-stone-900/90 p-5 sm:p-6 border border-stone-200/60 dark:border-stone-800/60`.
   - Live Status Badge: Botanical pill with a pulsing organic dot (`<span className="size-1.5 rounded-full bg-[#5F7C65] animate-pulse" /> Live`).

3. **Metadata & Credential Bento Grids**:
   - 2-column or 4-column cards with `rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white/90 dark:bg-stone-900/60 p-4 shadow-2xs`.
   - Eyebrow metadata label: `text-[10px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400`.
   - Monospace values: tabular numbers and clean truncation.
   - Subtle copy buttons with feedback states: Green checkmark in `#5F7C65` on copy.

4. **Administrative Action Buttons**:
   - Primary Affirmative Action: Tactile Botanical Sage (`bg-[#5F7C65] hover:bg-[#526D57] text-white shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.2)] rounded-xl`).
   - Secondary Utility Actions: Refined Stone outlines (`border border-stone-300 dark:border-stone-700 bg-white/80 dark:bg-stone-800 text-stone-700 dark:text-stone-200 rounded-xl`).
   - Destructive / Disconnect Actions: Stone outline with muted rust/red hover (`border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:text-red-700 hover:bg-red-50/60 rounded-xl`).

5. **Delivery Receipts & Diagnostic Legends**:
   - Status indicators (Sent, Delivered, Seen, Failed) presented in tactile micro-cards with soft icon badges and crystal-clear subtitles.
   - Distinctive WhatsApp Seen state: `#53bdeb` (sky blue) for read double-ticks, with Botanical Sage for delivered double-ticks.

---

## 6. How Future Components Should Be Designed

When designing new components (e.g., modal dialogs, data tables, campaign builders, contact cards):

1. **Start with the Surface**: Choose Parchment `#FAF8F5` for primary background, Sandstone `#F4F1EB` for container fills, and crisp White `#FFFFFF` for elevated focus cards.
2. **Use Concentric Radii**: If the parent container is `rounded-2xl` (16px), the nested inner elements must be `rounded-xl` (12px) to maintain harmonious curves.
3. **Restrain Accents**: Never color every element green. Use Botanical Sage (`#5F7C65`) exclusively for the **single primary goal** of the screen. All secondary actions use Stone tones.
4. **Micro-Typography**: Accompany metric numbers with uppercase 10px-11px eyebrow labels with `tracking-wider` and `font-semibold`.
5. **No Harsh Borders**: Always soften borders to `border-stone-200/80` (light) or `border-stone-800/80` (dark).
6. **Mobile First**: Verify that every multi-column grid gracefully collapses into a single-column layout with `gap-4` or `gap-6` on screens `< 768px`.

---

## 7. Anti-Patterns & Banned AI Tells

- ❌ **No thick 2px dark drop-shadows**: Use diffused ambient shadows `shadow-[0_4px_20px_-4px_rgba(30,45,35,0.06)]`.
- ❌ **No generic 3-equal card rows**: Add variance with 2-column bento grids, asymmetric splits, or visual hierarchy.
- ❌ **No neon button glows**: No `shadow-[0_0_20px_#25D366]`.
- ❌ **No pure black backgrounds**: Use deep charcoal `#0C0F0D` or zinc `#18181B`.
- ❌ **No Inter font**: Use `Geist` as standard sans and `Georgia` for display italics.

---

## 8. Media Library & Asset Management Patterns (`/protected/media`)

1. **On-Demand Inline Drag-and-Drop Staging**:
   - The drag-and-drop section is embedded directly into the page canvas, hidden by default to keep the interface clean and spacious.
   - It is revealed on-demand when the user clicks **"Upload Media"**, or automatically as soon as a user starts dragging files into the browser window.
   - Files dropped into the section or window are deduplicated and staged into client memory without any full-screen overlay obstruction or duplicate uploads.

2. **Two-Phase Upload Pattern (Stage → Preview → Confirm)**:
   - **Phase 1 (Staging)**: Dropped or selected files are staged into client memory with format detection and image thumbnail generation (`URL.createObjectURL`).
   - **Phase 2 (Confirmation Dialog)**: An itemized review modal opens with individual file rows, format badges, size indicators, removal triggers, and auto-optimization flags for images >5MB.
   - Uploading only begins when the user clicks **"Confirm & Upload"**.

3. **Ephemeral Presigned URL Toast Notifications**:
   - Presigned S3 access links expire after 60 minutes.
   - Copying a link produces immediate affirmative feedback: an inline "Copied" checkmark state and a toast notification detailing the 60-minute active lifespan.

4. **Destructive Asset Deletion Dialog**:
   - Replacing abrupt browser `confirm()` with a double-bezel modal showing the asset preview, file name, byte size, and an informational note that existing WhatsApp message history remains intact.

---

## 9. Dedicated Resource Inspector & Studio Workspace Patterns (`/protected/templates/[id]`, etc.)

1. **Dedicated Studio Inspector over Cramped Modals**:
   - Complex SaaS entities with multi-part structures (such as WhatsApp templates with dynamic variables, media headers, action buttons, and Meta review states) must use a dedicated, full-width Studio Workspace rather than cramped modal dialogs.
   - Prominent breadcrumb hierarchy (`← Templates / [template_name]`) provides immediate situational context and a frictionless return path.

2. **Asymmetric Studio Architecture (60/40 Split)**:
   - **Left Column (Component Architecture & Metadata)**:
     - **Bento Metric Bar**: Monospace Template ID, Category, Language, and Meta Last-Updated timestamp.
     - **Meta Review Banner**: Dynamic semantic status banner (`Approved`, `Pending`, or `Rejected` with actionable error diagnostic).
     - **Doppelrand Component Breakdown**: Itemized cards for Header (format badge, sample attachment), Body (parsed variable tags `{{1}}`, copy button, character metrics), Footer, and Buttons.
     - **Developer Quick Reference**: Read-only JSON payload preview and curl command snippet for Meta WhatsApp Cloud API integration.
   - **Right Column (Authentic Tactile Device Mockup)**:
     - Smartphone shell with speaker notch, verified business header, `#005C4B` dark teal chat bubble, interpolated sample text, and tactile buttons.
     - Anchored with `sticky top-6` so the visual verification remains in viewport while reviewing lengthy component trees.

3. **Non-Modal Destructive Safeguard**:
   - Deletion triggers an in-page double-bezel confirmation card with clear operational warnings regarding active broadcast campaigns, avoiding jarring native browser `confirm()` popups.
