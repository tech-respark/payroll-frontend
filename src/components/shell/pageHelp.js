import { isOpsUser } from '../../access/homeAccess';

const canSeeOthers = (hasAccess) => Boolean(hasAccess?.(['VIEW_OTHER_STAFF', 'MANAGE_STAFF']));

export function resolvePageHelp(pathname, hasAccess) {
  const isSelf = !canSeeOthers(hasAccess);
  const isOps = isOpsUser(hasAccess);
  const canHr = Boolean(hasAccess?.(['VIEW_HR_DASHBOARD']));

  if (pathname === '/home' || pathname === '/') {
    if (!isOps) return 'Your shift, leave, and pay for today. Open a card when you need the full screen.';
    return canHr
      ? 'Queues that need a decision, then the store snapshot. Open a card to work the list.'
      : 'What needs a decision today. Open a card to work the list.';
  }
  if (pathname.startsWith('/activity')) {
    return 'Who changed leave, roster, roles, payroll, and sign-in for this store. Open a row for the related record and extra details.';
  }
  if (pathname.includes('reports/detailed')) {
    return 'Day-by-day hours punched for one person in the date range.';
  }
  if (pathname.includes('reports/payroll')) {
    return 'Earnings, deductions, net, and headcount for the selected pay period.';
  }
  if (pathname.includes('report')) {
    return 'Compare hours planned on the roster with hours punched for each person in the date range.';
  }
  if (pathname.includes('staff')) {
    return isSelf
      ? 'Your account details. Contact HR if something needs to change.'
      : 'Open a person to edit their profile, pay cycle, bank details, and documents. Inactive staff cannot sign in.';
  }
  if (pathname.includes('leave-dashboard')) {
    return 'Check remaining balances and your requests. Request leave when you need time off. Cancelling an approved request waits for a manager.';
  }
  if (pathname.includes('leave-approvals')) {
    return 'Review pending leave and cancellation requests for your team.';
  }
  if (pathname.includes('leave-configuration')) {
    return 'Define leave types, group them into plans, and enroll staff. Open a row to edit.';
  }
  if (pathname.includes('holidays')) {
    return 'Store holidays used for attendance and optional-holiday leave. Click a day to add one.';
  }
  if (pathname.includes('my-work')) {
    return 'Clock the shift you are working, set the days you can come in, and ask a teammate for cover.';
  }
  if (pathname.startsWith('/pay-run')) {
    return 'Calculate the month, skip people who should not be paid, then submit, approve, publish, and lock.';
  }
  if (pathname.startsWith('/claims')) {
    return 'Submit reimbursements and IT declarations. Approved items land on the next pay run.';
  }
  if (pathname.startsWith('/loans')) {
    return 'Record a loan. The EMI is recovered on the next calculated pay run.';
  }
  if (pathname.startsWith('/settlements')) {
    return 'Draft a leaving settlement. Settling closes open loans and marks the person inactive.';
  }
  if (pathname.includes('hospitality')) {
    return 'Store-level extras for salons and restaurants. Record advances, sales, and rates here. When payslips already exist, open Apply & export.';
  }
  if (pathname.includes('attendance')) {
    return isSelf
      ? 'The calendar is the day. The right pane is punches, late or early marks, and leave still available.'
      : 'Choose a person. The calendar is the day. The right pane is punches, late or early marks, and leave still available.';
  }
  if (pathname.includes('approvals')) {
    return 'Review late, missing, or corrected punches. Approve what should count toward the day. Rejected punches stay on the attendance calendar but do not mark the person present.';
  }
  if (pathname.includes('shifts')) {
    return 'Create shift templates, then assign them to staff for a date range. Weekly schedule is a read-only view of what was saved.';
  }
  if (pathname.includes('salary')) {
    return isSelf
      ? 'Your recurring salary and any month-only extras such as bonus or incentive.'
      : 'Set the recurring salary for a person, then add month-only extras such as bonus or incentive.';
  }
  if (pathname.includes('payslip')) {
    return isSelf
      ? 'Open the letterhead payslip for a calculated month, then download the PDF.'
      : 'Open the letterhead payslip for one person and one calculated month, then download the PDF.';
  }
  if (pathname.includes('roles')) {
    return 'Create roles and turn on the modules each role can use. A refresh reloads permissions from the server.';
  }
  if (pathname === '/ops' || pathname === '/ops/') {
    return 'List or cards of licensed tenants. Filter by source product, payroll plan, expiry, salesperson, or status. Usage is stores and staff against the license cap. Open a row for the client record.';
  }
  if (pathname === '/ops/clients/new') {
    return 'Create the company, pick a source product from the catalog (the default is used if you leave it), then first store and letterhead, license, and client admin. Clone packs or apply the system salary, leave, and holiday packs.';
  }
  if (/^\/ops\/clients\/\d+$/.test(pathname)) {
    return 'Source product, license, letterhead, integrations, packs, and client users. Readiness includes whether a client admin has signed in. Superadmin can edit formulas and open a 30-minute support tab.';
  }
  if (pathname.startsWith('/ops/products')) {
    return 'Catalog of source products. Add first-party or third-party suites. Payroll stays standalone until a connector is built.';
  }
  if (pathname.startsWith('/ops/operators')) {
    return 'Platform users only. They never appear in a client Roles screen and cannot open /home. Set or rotate passwords here.';
  }
  return null;
}
