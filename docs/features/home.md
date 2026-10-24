# Home

> **Audience:** Employees, managers, HR, payroll, support, developers  
> **Purpose:** Explain the role-aware home landing after sign-in  
> **Last verified:** 2026-10-24  
> **Source of truth:** `HomeDashboard`, `homeAccess.js`, `App.jsx`, `Login.jsx`

## Route

`/home` is the authenticated landing page. Login, `/`, unknown routes, and `/hr-dashboard` all resolve here. Access is permission-composed, not a separate product per persona.

| Layout | Who sees it | What it shows |
| --- | --- | --- |
| Staff home | Users without an operations gate (`VIEW_OTHER_STAFF`, `MANAGE_STAFF`, a `MANAGE_*` permission, `VIEW_REPORTS`, `VIEW_HR_DASHBOARD`, or hospitality access). `VIEW_ACTIVITY_LOG` is not an operations gate. | Today’s shift and clock, leave balances, latest saved `personnel_payslip_history` month when one exists, shortcuts |
| Operations home | Everyone else | Leave and regularization queues, the same latest saved payslip month when the role can view pay, shortcuts, and the existing HR metrics when `VIEW_HR_DASHBOARD` is present |

## Staff home

One read: `GET /home/staff`. The server resolves the signed-in staff from the JWT (no staff id in the request) and returns greeting, today’s shift and clock state, leave balances plus pending count, and the latest `personnel_payslip_history` month+year when the role can view pay. Leave balances are ledger reads only; yearly allotment is written when the person applies or when accrual runs.

Clock in or out still writes `POST /hospitality/clock` (same as My Work). **Request leave** opens My Leaves with `?apply=1`.

## Operations home

One read: `GET /home/operations?includeSnapshot=true`. The server returns permission-gated queues (pending leave, pending regularization requests with `upload_source = REGULARIZATION` in the last 45 days, distinct people away today), the same latest `personnel_payslip_history` month+year as staff Home when the role can view pay (not the attendance cursor), and the HR snapshot when `VIEW_HR_DASHBOARD` is present. Queue dates and the snapshot use Asia/Kolkata. Attendance Today in the snapshot is the share of rostered staff who punched.

The header bell uses the same route with `includeSnapshot=false` so it only pays for queue counts. Cards hide when the matching queue field is `null`. `/hr-dashboard` redirects to `/home`. People with `VIEW_ACTIVITY_LOG` also see a Recent activity card (latest five events from `GET /activity`, with actor, time, and module) and a shortcut to `/activity`.

`GET /admin/dashboard/metrics` remains for the snapshot contract and is reused inside the operations home service.

## Navigation

Home is the first Overview item for both staff-only and admin sidebars. Command palette, account shortcuts, and the help-center **Open app** link also target `/home`.

## Known behavior

- Home does not replace Attendance, Leave, Salary, or Approvals. It jumps into those screens.
- Staff clock still depends on the hospitality clock endpoints. If that call fails, the Today card stays empty and My Work remains the fallback.
- Queue visibility follows the same permission pairs as the header bell.
