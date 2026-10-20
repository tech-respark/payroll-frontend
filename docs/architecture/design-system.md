# Design system (Minimal-inspired)

> **Audience:** Frontend developers, designers, technical reviewers  
> **Purpose:** Document shared tokens, shell layout, UI primitives, and styling rules  
> **Last verified:** 2026-10-20  
> **Source of truth:** `src/styles/main.scss`, `src/components/ui/`, shell components (`Navigation`, `TopHeader`)

Payroll uses a **custom** Minimal-inspired layer: CSS variables, Sass modules, and Lucide icons (`react-icons/lu`). It is not the commercial Minimal React template; behavior and class names are owned by this repository.

## Design tokens

Brand/shell tokens and **light surface defaults** live on `:root` in `src/styles/main.scss`. `[data-theme='light']` and `[data-theme='dark']` override the full surface/text/badge set. `index.html` sets `data-theme` from `localStorage` before React boots so dark mode does not flash unstyled.

| Category | Examples | Notes |
| --- | --- | --- |
| Brand | `--primary-color`, `--primary-color-dark`, `--primary-color-alpha`, `--primary-color-shadow` | Green primary (`#00A76F` light); use for CTAs and focus rings |
| Semantic | `--success-color`, `--warning-color`, `--error-color`, `--info-color` | Status dots and non-badge accents |
| Surfaces | `--bg-color`, `--bg-card`, `--bg-subtle`, `--bg-hover` | Page vs card vs inset panels |
| Text | `--text-dark`, `--text-muted`, `--text-label`, `--text-disabled` | `--text-dark` is **not** a button fill (it becomes white in dark mode) |
| Borders & shadow | `--border-color`, `--border-color-strong`, `--shadow-card`, `--shadow-md` | Prefer soft 1px borders over heavy outlines |
| Inputs | `--input-border`, `--input-bg` | Transparent in light; `--bg-subtle` in dark |
| Badges | `--badge-*-bg`, `--badge-*-fg` | Light/dark-safe label colors for success, warning, danger, info, primary |
| Shell | `--sidebar-width` (280px), `--sidebar-mini-width` (88px), `--header-height` (64px) | Mini rail matches Minimal’s 88px icon column |
| Typography | `--primary-font` (Public Sans), `--display-font` (Barlow) | No Inter; stack matches Minimal marketing |

Theme is toggled via `data-theme` on the document root (`ThemeContext`).

## Application shell

Authenticated layout (`App.jsx` + global classes in `main.scss`):

- Fixed sidebar (280px expanded, **88px** mini icon rail) and 64px top header. Collapse/expand uses `--sidebar-motion` (280ms ease); main content only animates `margin-left` to avoid width+margin jitter. Labels clip/fade in place; open groups close on collapse and reopen after expand. Desktop collapsed preference persists in `localStorage`; mobile drawer uses an overlay under the nav, Escape to dismiss, and no mini rail. `prefers-reduced-motion` disables sidebar motion.
- Main scroll region: `.main-content` with **24px** horizontal gutters (16px on small breakpoints).
- Feature surfaces often use `.dashboard-content` or `.mp-card` (16px radius, `--shadow-card`).
- **Page title lives in `TopHeader` only** — do not repeat the route name as an in-page `h1` (“My Leaves”, “Calendar”, etc.). Keep section titles inside cards/widgets; put primary actions in a slim toolbar when needed.

### Header actions (`TopHeader` + `src/components/shell/`)

| Control | Behavior |
| --- | --- |
| Search / ⌘K | Opens `CommandPalette` — permission-filtered page jump (`navCommands.js`). Also **Ctrl+K** on non-Mac. |
| Bell | Opens `NotificationsDrawer` — pending leave approvals and regularization counts (`useHeaderNotifications`). Badge shows total actionable items. |
| Avatar | Opens `AccountDrawer` (320px) — name/email/role/store, quick links (Attendance, My Leaves, Payslips, Staff), dark-mode switch, sign out. |

Body scroll is locked while `Modal`, `Drawer`, or the command palette is open (`useBodyScrollLock`).

## UI primitives (`src/components/ui`)

| Primitive | Module | Use when |
| --- | --- | --- |
| `Button` | `ui.module.scss` | Actions; variant `primary` is the green CTA |
| `Input` | `ui.module.scss` | Text fields; 40px min-height, 3px focus ring |
| `Card` | `ui.module.scss` | Grouped content with header/body/footer |
| `Badge` | `ui.module.scss` | Inline status chips |
| `Checkbox`, `Radio`, `Switch` | `FormControls.module.scss` | Settings and forms; `Switch` row variant is compact |
| `Modal` | `Overlay.module.scss` | Short confirmations; sizes `sm`–`xl` |
| `Drawer` | `Overlay.module.scss` | Create/edit side panels; default width **480px** |

Overlays share **16px** radius, `--shadow-md`, **24px** header/body padding, and a sticky footer on `--bg-subtle` with a solid top border.

Legacy `SidePanel` remains for older flows; prefer `Drawer` for new work.

## Global utilities (`.mp-*`)

Defined in `main.scss` for screens that are not yet on CSS modules:

| Class | Role |
| --- | --- |
| `.mp-page` | Vertical stack with 24px gap |
| `.mp-toolbar` | Title/actions row with wrap |
| `.mp-btn-primary` | Green CTA matching `Button` primary |
| `.mp-card`, `.mp-card-flush` | Card surfaces |
| `.mp-section-title`, `.mp-label` | Section typography |
| `.mp-empty`, `.mp-empty-title`, `.mp-empty-hint` | Empty states |
| `.mp-input` | Token-aligned native inputs |
| `.mp-table` | Minimal-style data tables |

## Rules of thumb

1. **Green CTAs only** — Primary actions use `var(--primary-color)` or `<Button variant="primary">`. Do not fill buttons with `var(--text-dark)`.
2. **40px controls** — Inputs, primary buttons, and `.mp-btn-primary` target 40px minimum height.
3. **24px rhythm** — Section gaps, card body padding, and overlay padding use 24px unless density requires tighter tables.
4. **Tokens over hex** — Use CSS variables for colors, borders, and shadows so dark mode stays readable.
5. **Shared overlays and forms** — Use `Modal` / `Drawer` and `Checkbox` / `Radio` / `Switch` instead of one-off modals or native controls on touched screens.
6. **Icons** — Lucide via `react-icons/lu`; avoid ad-hoc SVG sets for navigation chrome.

## Related documentation

- [System architecture](system-architecture.md) — provider stack and lazy-loaded screens
- [Known limitations](../operations/known-limitations.md) — UI migration status and product gaps
