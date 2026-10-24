/**
 * Permission-aware quick-nav entries for ⌘K command palette and account shortcuts.
 */

export const NAV_COMMANDS = [
  {
    id: 'home',
    title: 'Home',
    path: '/home',
    group: 'Overview',
    keywords: ['dashboard', 'today', 'overview', 'start'],
    perms: null,
  },
  {
    id: 'staff',
    title: 'Staff Details',
    path: '/staff',
    group: 'Staff',
    keywords: ['employees', 'people', 'directory'],
    perms: null,
  },
  {
    id: 'roles',
    title: 'Roles & Permissions',
    path: '/roles',
    group: 'Staff',
    keywords: ['access', 'permissions'],
    perms: ['MANAGE_ROLES'],
  },
  {
    id: 'shifts',
    title: 'Shift Management',
    path: '/shifts',
    group: 'Shifts',
    keywords: ['roster', 'schedule'],
    perms: ['VIEW_SHIFTS', 'MANAGE_SHIFTS'],
  },
  {
    id: 'attendance',
    title: 'Attendance',
    path: '/attendance',
    group: 'Attendance',
    keywords: ['punch', 'timesheet'],
    perms: null,
  },
  {
    id: 'my-work',
    title: 'My Work',
    path: '/my-work',
    group: 'Attendance',
    keywords: ['clock', 'swap', 'availability'],
    perms: null,
  },
  {
    id: 'approvals',
    title: 'Regularization Approvals',
    path: '/approvals',
    group: 'Approvals',
    keywords: ['regularize', 'corrections', 'pending', 'approvals'],
    perms: ['MANAGE_ATTENDANCE'],
  },
  {
    id: 'my-leaves',
    title: 'My Leaves',
    path: '/leave-dashboard',
    group: 'Leave',
    keywords: ['apply', 'balance', 'pto'],
    perms: null,
  },
  {
    id: 'leave-approvals',
    title: 'Leave Approvals',
    path: '/leave-approvals',
    group: 'Approvals',
    keywords: ['pending', 'approve', 'approvals'],
    perms: ['MANAGE_LEAVES'],
  },
  {
    id: 'leave-config',
    title: 'Leave Configuration',
    path: '/leave-configuration',
    group: 'Leave',
    keywords: ['policy', 'balances'],
    perms: ['MANAGE_LEAVES'],
  },
  {
    id: 'holidays',
    title: 'Holiday Calendar',
    path: '/settings/holidays',
    group: 'Leave',
    keywords: ['calendar', 'public holiday'],
    perms: ['MANAGE_LEAVES'],
  },
  {
    id: 'salary',
    title: 'Salary Management',
    path: '/salary',
    group: 'Payroll',
    keywords: ['compensation', 'components'],
    perms: ['VIEW_SALARY', 'MANAGE_SALARY'],
  },
  {
    id: 'payslips',
    title: 'Payslips',
    path: '/payslips',
    group: 'Payroll',
    keywords: ['salary slip', 'payroll'],
    perms: ['VIEW_SALARY', 'MANAGE_SALARY'],
  },
  {
    id: 'hospitality',
    title: 'Hospitality Payroll',
    path: '/hospitality',
    group: 'Payroll',
    keywords: ['tips', 'commission', 'advance', 'fnf', 'pf'],
    perms: ['MANAGE_SALARY', 'VIEW_HOSPITALITY', 'MANAGE_HOSPITALITY'],
  },
  {
    id: 'pay-run',
    title: 'Pay run',
    path: '/pay-run',
    group: 'Payroll',
    keywords: ['calculate', 'approve', 'publish', 'skip', 'off-cycle'],
    perms: ['VIEW_SALARY', 'MANAGE_SALARY'],
  },
  {
    id: 'claims',
    title: 'Claims',
    path: '/claims',
    group: 'Payroll',
    keywords: ['reimbursement', 'declaration', '80c', 'hra'],
    perms: null,
  },
  {
    id: 'loans',
    title: 'Loans',
    path: '/loans',
    group: 'Payroll',
    keywords: ['emi', 'advance', 'loan'],
    perms: null,
  },
  {
    id: 'settlements',
    title: 'Settlements',
    path: '/settlements',
    group: 'Payroll',
    keywords: ['fnf', 'exit', 'full and final'],
    perms: ['VIEW_SALARY', 'MANAGE_SALARY'],
  },
  {
    id: 'payroll-cost',
    title: 'Payroll cost',
    path: '/reports/payroll',
    group: 'Reports',
    keywords: ['cost', 'budget', 'headcount'],
    perms: ['VIEW_SALARY', 'VIEW_REPORTS', 'MANAGE_SALARY'],
  },
  {
    id: 'reports',
    title: 'Attendance Summary',
    path: '/reports',
    group: 'Reports',
    keywords: ['summary', 'analytics'],
    perms: ['VIEW_REPORTS'],
  },
  {
    id: 'reports-detailed',
    title: 'Staff Detailed Report',
    path: '/reports/detailed',
    group: 'Reports',
    keywords: ['detailed', 'export'],
    perms: ['MANAGE_ATTENDANCE', 'MANAGE_SALARY'],
  },
  {
    id: 'activity',
    title: 'Activity log',
    path: '/activity',
    group: 'Overview',
    keywords: ['audit', 'history', 'who changed', 'events'],
    perms: ['VIEW_ACTIVITY_LOG'],
  },
];

export function getAccessibleCommands(hasAccess) {
  const isSelfProfile = !hasAccess(['VIEW_OTHER_STAFF', 'MANAGE_STAFF']);
  return NAV_COMMANDS.filter((cmd) => {
    if (!cmd.perms) return true;
    return hasAccess(cmd.perms);
  }).map((cmd) => {
    if (cmd.id === 'staff' && isSelfProfile) {
      return { ...cmd, title: 'Profile', group: 'Account', keywords: ['profile', 'account', 'details'] };
    }
    return cmd;
  });
}

export function filterCommands(commands, query) {
  const q = query.trim().toLowerCase();
  if (!q) return commands;
  return commands.filter((cmd) => {
    const hay = [cmd.title, cmd.group, ...(cmd.keywords || [])].join(' ').toLowerCase();
    return hay.includes(q);
  });
}
