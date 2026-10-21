# Design system (Hajiro)

> **Audience:** Frontend developers, designers, technical reviewers  
> **Purpose:** Document shared tokens, shell layout, UI primitives, and styling rules  
> **Last verified:** 2026-10-21  
> **Source of truth:** `src/styles/hajiro-theme.css`, `src/styles/main.scss`, `src/components/ui/`, shell components (`Navigation`, `TopHeader`)

Payroll uses the **Hajiro v1** palette and spacing rules on the existing product shell. Product name and logo stay as they are in this repository. CSS variables, Sass modules, and Lucide icons (`react-icons/lu`) remain the implementation layer.

Brand tokens live in `src/styles/hajiro-theme.css` (`--hj-*`). `main.scss` maps those onto the existing `--primary-color`, `--bg-card`, and `--text-dark` names so screens do not hardcode hex values.

## Brand principles

- Clear, calm, dependable, human, operationally efficient.
- Navy for headings and brand anchors, **blue for primary actions**, teal as a restrained accent.
- Keep product UI light and low-noise. Do not use gradients on large surfaces. Small avatar marks may use the blue–teal logo gradient.
- 60% neutral surfaces, 30% navy/text/structure, 10% blue/teal accents.
- Do not use teal for long paragraphs or as the default success color. Success is `#16805D`.

## Design tokens

Brand/shell tokens and **light surface defaults** live on `:root` in `src/styles/main.scss` after `hajiro-theme.css`. `[data-theme='light']` and `[data-theme='dark']` override the full surface/text/badge set. `index.html` sets `data-theme` from `localStorage` before React boots so dark mode does not flash unstyled.

| Category | Examples | Notes |
| --- | --- | --- |
| Brand | `--hj-brand-navy` `#10264D`, `--hj-brand-blue` `#2477D4`, `--hj-brand-teal` `#18B7A0`, `--hj-brand-slate` `#71829D` | Matches the Hajiro mark (blue–teal H) and navy wordmark |
| Product aliases | `--primary-color`, `--primary-color-dark`, `--primary-color-alpha`, `--accent-color`, `--brand-navy` | Primary is **blue**; teal is `--accent-color` only |
| Semantic | `--success-color`, `--warning-color`, `--error-color`, `--info-color` | Status dots and non-badge accents; pair with a label |
| Surfaces | `--bg-color` `#F6F9FC`, `--bg-card`, `--bg-subtle`, `--bg-hover` | White cards on a soft grey-blue page |
| Text | `--text-dark` `#17243A`, `--text-muted`, `--text-label`, `--text-disabled` | `--text-dark` is **not** a button fill (it becomes light in dark mode) |
| Borders & shadow | `--border-color` `#DCE5EF`, `--border-color-strong`, `--shadow-card` | Prefer 1px borders and restrained navy-tinted shadows |
| Inputs | `--input-border`, `--input-bg` | White surface, 42px min-height, blue focus ring |
| Badges | `--badge-*-bg`, `--badge-*-fg` | Soft tinted chips with readable foreground text |
| Shell | `--sidebar-width` (248px), `--sidebar-mini-width` (88px), `--header-height` (64px) | Hajiro sidebar width; mini rail stays 88px |
| Typography | `--primary-font` / `--display-font` (Inter) | Body 16px / 1.5; sentence case; no all-caps headings |

Theme is toggled via `data-theme` on the document root (`ThemeContext`). Dark mode uses Minimal grey steps (`#141A21` page, `#1C252E` paper, `#28323D` inset) with Hajiro blue for actions. Status fill tokens (`--hj-success-bg`, warning, danger) are remapped to translucent dark tints so callouts and badges stay readable.

## Application shell

Authenticated layout (`App.jsx` + global classes in `main.scss`):

- Fixed sidebar (248px expanded, **88px** mini icon rail) and 64px top header. The rail is a white (light) or Minimal grey (dark) surface. The current destination is a rounded Hajiro-blue wash — no left accent bar. Collapse/expand uses `--sidebar-motion` (280ms ease); main content only animates `margin-left` to avoid width+margin jitter. Labels clip/fade in place; open groups close on collapse and reopen after expand. Staff-only users get a flat destination list instead of accordion groups, starting with **Home** and **Profile** pinned to the bottom of the list, then Activity log when permitted. Manager navigation puts leave and regularization queues in a dedicated **Approvals** group. The sidebar footer is Documentation and logout; theme and store name live only in the account drawer. Desktop collapsed preference persists in `localStorage`; mobile drawer uses an overlay under the nav, Escape to dismiss, and no mini rail. `prefers-reduced-motion` disables sidebar motion. Login and unknown routes land on `/home`.
- Main scroll region: `.main-content` with **24px** horizontal gutters (16px on small breakpoints).
- Feature surfaces often use `.dashboard-content` or `.mp-card` (16px radius, `--shadow-card`).
- **Page title lives in `TopHeader` only** — do not repeat the route name as an in-page `h1`. Keep section titles inside cards/widgets; put primary actions in a slim toolbar when needed.

### Header actions (`TopHeader` + `src/components/shell/`)

| Control | Behavior |
| --- | --- |
| Search / ⌘K | Opens `CommandPalette` — permission-filtered page jump (`navCommands.js`). Also **Ctrl+K** on non-Mac. |
| Bell | Opens `NotificationsDrawer` — pending leave approvals and regularization counts (`useHeaderNotifications`). Badge shows total actionable items. |
| Avatar | Opens `AccountDrawer` (320px, no Account heading) — name/email/role/store, quick links, dark-mode switch, then a staff-only collapsible **What you can do** list (plain language, not `VIEW_*` codes) just above sign out. |

Body scroll is locked while `Modal`, `Drawer`, or the command palette is open (`useBodyScrollLock`).

## UI primitives (`src/components/ui`)

| Primitive | Module | Use when |
| --- | --- | --- |
| `Button` | `ui.module.scss` | Actions; variant `primary` is the **blue** CTA (40px, 10px radius, white text) |
| `Input` | `ui.module.scss` | Text fields; 42px min-height, 3px blue focus ring |
| `Card` | `ui.module.scss` | Grouped content with header/body/footer |
| `Badge` | `ui.module.scss` | Inline status chips with text labels |
| `Checkbox`, `Radio`, `Switch` | `FormControls.module.scss` | Settings and forms; `Switch` row variant is compact |
| `Modal` | `Overlay.module.scss` | Short confirmations; sizes `sm`–`xl` |
| `Drawer` | `Overlay.module.scss` | Create/edit side panels; default width **480px** |
| `StaffPicker` | `StaffPicker.module.scss` | Searchable staff combobox; use instead of a native staff `<select>` |
| `ConfirmDialog` | wraps `Modal` | Approve, reject, delete, and other irreversible actions |

Page chrome: page explanations live on the header breadcrumb **i** control (`TopHeader` + `pageHelp.js`), not as a paragraph under the title. `.screenHint` in `main.scss` remains for in-page empty or lock notes. Do not add a second `h1`. Prefer `formatDisplayDate` / `prettyStatus` from `helpers/displayUtils.js` over raw ISO dates and `PENDING` enums.

Overlays share **16px** radius, `--shadow-md`, **24px** header/body padding, and a sticky footer on `--bg-subtle` with a solid top border. The footer uses the same 16px radius on its bottom corners so the gray action bar does not square off the card. Mobile sheets stay flush to the screen edge (`16px 16px 0 0`).

Legacy `SidePanel` remains for older flows; prefer `Drawer` for new work.

## Global utilities (`.mp-*`)

Defined in `main.scss` for screens that are not yet on CSS modules:

| Class | Role |
| --- | --- |
| `.mp-page` | Vertical stack with 24px gap |
| `.mp-toolbar` | Title/actions row with wrap |
| `.mp-btn-primary` | Blue CTA matching `Button` primary |
| `.mp-card`, `.mp-card-flush` | Card surfaces |
| `.mp-section-title`, `.mp-label` | Section typography |
| `.mp-empty`, `.mp-empty-title`, `.mp-empty-hint` | Empty states |
| `.mp-input` | Token-aligned native inputs |
| `.mp-table` | Data tables; sentence-case headers |

## Rules of thumb

1. **Blue CTAs only** — Primary actions use `var(--primary-color)` (`#2477D4`) or `<Button variant="primary">`. Teal is an accent, not the default button. Do not fill buttons with `var(--text-dark)`.
2. **40–42px controls** — Primary buttons 40px; inputs 42px; radius 10px (`--shape-borderRadius`).
3. **24px rhythm** — Section gaps, card body padding, and overlay padding use 24px unless density requires tighter tables. Spacing scale is 4px.
4. **Tokens over hex** — Use `--hj-*` or the mapped `--primary-color` / `--bg-*` variables so dark mode stays readable.
5. **Shared overlays and forms** — Use `Modal` / `Drawer` and `Checkbox` / `Radio` / `Switch` instead of one-off modals or native controls on touched screens. List/overview first; create and apply actions open a modal or drawer from a toolbar button. Do not keep create forms always visible above a list. Master-detail editors (Staff profile, Salary) stay list-plus-editor when more than one person is in scope; hide the directory column for a single-staff view. Put month/year pickers on the calendar or card header instead of their own filter row.
6. **Icons** — Lucide via `react-icons/lu`; avoid ad-hoc SVG sets for navigation chrome.
7. **Status** — Never rely on color alone. Pair chips with explicit text (Present, Absent, Draft, Paid).

## Related documentation

- [System architecture](system-architecture.md) — provider stack and lazy-loaded screens
- [Known limitations](../operations/known-limitations.md) — UI migration status and product gaps
