/**
 * Permission-aware quick-nav entries for ⌘K command palette and account shortcuts.
 */

export const NAV_COMMANDS = [
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
    group: 'Attendance',
    keywords: ['regularize', 'corrections', 'pending'],
    perms: ['MANAGE_ATTENDANCE', 'APPROVE_ATTENDANCE'],
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
    id: 'hr',
    title: 'HR Dashboard',
    path: '/hr-dashboard',
    group: 'Leave',
    keywords: ['executive', 'overview', 'headcount'],
    perms: ['VIEW_HR_DASHBOARD'],
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
    perms: ['MANAGE_LEAVES', 'MANAGE_HOLIDAYS'],
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
    group: 'Leave',
    keywords: ['pending', 'approve'],
    perms: ['MANAGE_LEAVES', 'APPROVE_LEAVES'],
  },
];

export function getAccessibleCommands(hasAccess) {
  return NAV_COMMANDS.filter((cmd) => {
    if (!cmd.perms) return true;
    return hasAccess(cmd.perms);
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
