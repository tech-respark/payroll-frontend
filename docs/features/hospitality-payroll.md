# Hospitality payroll

> **Audience:** Salon and restaurant operators, payroll administrators, support, developers  
> **Purpose:** Describe the hospitality pack for advances, commissions, service charge, statutory lines, labor, and employee self-service  
> **Last verified:** 2026-10-20  
> **Source of truth:** `HospitalityDashboard`, `MyWorkDashboard`, `HospitalityController`, `HospitalityService`

## Screens

| Route | Who sees it | Purpose |
| --- | --- | --- |
| `/hospitality` | `MANAGE_SALARY`, `VIEW_HOSPITALITY`, or `MANAGE_HOSPITALITY` | Store-level hospitality payroll tools |
| `/my-work` | Any authenticated user | Clock in/out, availability, shift swap |

Writes on `/hospitality` require `MANAGE_SALARY` or `MANAGE_HOSPITALITY`. Swap approval requires `MANAGE_SHIFTS` or `MANAGE_HOSPITALITY`.

## What it does

The pack sits beside the existing salary engine. It does not replace POS or booking software.

- **Advances / loans:** record cash advances and recover installments when hospitality lines are applied to a payslip.
- **Commission slabs:** SERVICE, RETAIL, PACKAGE, or REQUEST plans with a threshold and percent. Sales can be entered one row at a time or pasted as a list (`staff, date, category, amount`). JSON arrays are still accepted.
- **Service-charge pool:** draft a pool, then distribute by hours worked in the period.
- **Statutory lines:** PF, ESI, PT, TDS, and LWF **calculation only**. No EPFO/ESIC filing.
- **Labor vs sales:** daily outlet sales versus estimated labor cost and labor percent.
- **Full and final:** draft unpaid salary, recover open advances, then settle and mark the staff member inactive.
- **Apply & export:** muster-roll present/absent/hours, write `Hosp: ` lines onto existing payslips, and download a bank NEFT CSV of net pay. Salary calculation also applies hospitality after a monthly run. Advance recovery is once per payslip month; a second apply does not deduct again.
- **My Work:** mobile-friendly clock, weekday availability, and shift-swap requests. The clock card shows today’s date, rostered slot when one exists, and today’s punches as In/Out chips. Clock-out asks for confirmation. Staff search teammates from `/hospitality/me` so a floor user can request cover without `VIEW_OTHER_STAFF`. They also see swap rows they requested or were asked to cover. Approval exchanges roster rows for that date when either staff member is rostered (lookup uses both `personnel_details.id` and `personnel_code`). An overnight clock-out after midnight attaches to yesterday’s open punch.

Staff employment fields now include pay cycle, employment type, job codes, overtime multiplier, ESI number, and PAN. Shift templates can be marked overnight. Attendance summary treats a negative overnight interval as plus 24 hours and marks four-or-more punches as `SPLIT`.

## Limits

- WhatsApp payslip publish uses the existing RabbitMQ path and is an operational dependency.
- There is no live Petpooja, POSist, Invoay, or Salonist connector. Sales are manual or JSON import.
- Selfie images are not stored; clock-in can carry a geo note only.
- Statutory output is payslip lines, not government files.
- Demand forecasting and appointment booking are intentionally not implemented.
