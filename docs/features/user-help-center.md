# User help center

> **Audience:** End users, support, product, QA, frontend developers  
> **Purpose:** Describe the in-app documentation portal that signed-in users open from the dashboard  
> **Last verified:** 2026-10-24  
> **Source of truth:** `src/docs/`, `App.jsx`, `Navigation.jsx`

## What it is

The product help center is a standalone documentation site inside the same React app. It is written for people who use payroll every day — not for API or deployment work. Engineering documentation remains in this `docs/` portal.

Any authenticated user can read every article. The route is not permission-filtered. Opening `/docs` while signed out sends the browser to login with a `next` return path.

## How users open it

The help center always opens in a new browser tab from the sidebar footer **Documentation** control (staff-only and manager navigation).

## Route and layout

| Route | Screen | Frontend requirement |
| --- | --- | --- |
| `/docs` | Introduction / home | Authenticated |
| `/docs/:slug` | Article | Authenticated |

The help center does not use the payroll sidebar or top header. It has its own chrome: brand, search, theme toggle, article sidebar, and on-this-page outline. **Open app** returns to `/home` in another tab. Product screens explain themselves with the header breadcrumb **i** (`pageHelp.js`); that control is not part of this help chrome.

Content lives as Markdown in `src/docs/content/`. Navigation, cards, and search metadata live in `src/docs/catalog.js`.

## Standard reader tools

Implemented in `DocsApp`:

- grouped left navigation
- full-text search (`⌘K` / `Ctrl+K` or `/`) across titles and headings
- on-this-page table of contents with scroll spy
- breadcrumbs, previous/next page
- copy page as Markdown and copy page link
- heading permalinks
- callouts from `Note`, `Tip`, and `Warning` blockquotes
- code-block copy
- light/dark theme via the existing `ThemeContext`
- mobile navigation drawer
- local “Was this page helpful?” feedback in `localStorage`
- unknown slugs render an in-app 404

## Article map

Get started, everyday work, managers, HR and admin, payroll, and reference. Topics follow current screens: sign-in, navigation, home, profile, attendance, regularization, My Work, leave, payslips, approvals, shifts, staff, roles, leave policies, holidays, HR dashboard, salary, pay run, claims, loans, settlements, hospitality, reports, glossary, and FAQ.

## Related documentation

- [Feature index](README.md) — module guides for implementers
- [Routes and permissions](../reference/routes-and-permissions.md) — route gates
- [Design system](../architecture/design-system.md) — shell entry points
