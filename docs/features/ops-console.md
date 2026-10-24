# Internal ops console

> **Audience:** Relfor operators, implementation, support, developers  
> **Purpose:** Document the internal `/ops` console used to license and onboard client tenants  
> **Last verified:** 2026-10-24  
> **Source of truth:** `App.jsx` ops shell, `controller/ops`, `entity/PlatformUser`, `entity/PlatformProduct`, `entity/TenantSubscription`

## Shell

Ops uses the same Hajiro chrome as the client app: 248px sidebar (88px mini rail), 64px header with title and breadcrumbs, 24px page gutters, and shared cards/buttons. Page titles live in the header. Destinations are **Clients**, **New client**, **Products** (superadmin), and **Operators** (superadmin). There is no client search or notification bell.

## Who this is for

The ops console is **internal only**. It is not a client payroll screen and it is not listed in the signed-in user help center.

Two platform roles exist outside `s_role`:

- `superadmin` — full console, including operator CRUD, salary definition add/edit/delete, suspend/expire, and a 30-minute support session
- `sales` — their own client book, licenses, onboarding wizard, and packs. Cannot manage operators, add salary definitions, reassign a salesperson, or mint support sessions

Those role names never appear on client Roles & Permissions. A sales user only sees tenants whose `sales_owner_id` is their platform user id.

## Routes

| Route | Who |
| --- | --- |
| `/ops/login` | Public platform login |
| `/ops` | superadmin, sales (sales sees their book only) |
| `/ops/clients/new` | superadmin, sales |
| `/ops/clients/:tenantId` | superadmin, or sales who owns the tenant |
| `/ops/products` | superadmin only |
| `/ops/operators` | superadmin only |
| `/ops/support-launch` | Public one-time handoff for a support session |
| `/ops/support-ended` | Public end page when no ops session remains |

A platform JWT cannot open `/home` or any client screen. A client JWT cannot open `/ops`. Client `/login` and `/ops/login` look up different tables. Superadmin can open a short-lived client window through a one-time handoff code; that tab uses `sessionStorage` and does not replace the ops `localStorage` session.

## What operators do

1. Sign in at `/ops/login`.
2. Work the Clients dashboard as a list (default) or cards. Filter by source product, payroll plan, expiry window, salesperson (superadmin), and status. Usage shows current stores and staff against license caps.
3. Run the onboarding wizard: company and source product (the catalog default, currently Devourin), first store and letterhead, license, client admin, salary pack or clone-from, leave pack, holiday pack, optional shift, optional integrations. Payroll stays standalone; the product field is a catalog label, not a live connector.
4. Open a client record to change the source product, edit the license (dates, caps, plan, modules, notes), review license history, edit store letterhead, change live integrations, apply or clone packs, add or reset a client admin, and (superadmin) preview or edit salary formulas. Clone-from copies missing salary aliases, empty letterhead fields, leave types, and holidays; it does not duplicate existing aliases or overwrite a filled company name or address.
5. Superadmin maintains the source-product catalog (add first-party or third-party suites, set the default, deactivate unused rows), opens a 30-minute support session in a new tab, then can revoke it. Operators rotate their own password from the account drawer. Holiday pack writes the six fixed national dates to every store when no store is selected. Client-user rows show last sign-in; readiness is Yes after the first successful client `/login` (support sessions do not count). Existing tenants without a product are assigned the catalog default.

The first platform user is created by the backend seeder when `platform_user` is empty. Production must rotate that bootstrap account. Do not record its password here.

## APIs

Prefix `/payroll-management/v1/ops`. All paths except `/ops/login` and `/ops/support-handoff/{code}` require `principalType=PLATFORM`.

See [API reference](../reference/api-reference.md) for the path list and [tenant onboarding](../operations/tenant-onboarding.md) for the wizard sequence.
