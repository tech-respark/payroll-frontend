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
      ? 'Preview your stored payslip for a calculated month.'
      : 'Preview a stored payslip for one person and one calculated month.';
  }
  if (pathname.includes('roles')) {
    return 'Create roles and turn on the modules each role can use. Staff pick up these permissions at the next sign-in.';
  }
  return null;
}
