export const HOME_PATH = '/home';

/** Permissions that mean the user manages other people or store operations. */
export const OPS_GATES = [
  'VIEW_OTHER_STAFF',
  'MANAGE_STAFF',
  'MANAGE_ROLES',
  'MANAGE_SHIFTS',
  'MANAGE_ATTENDANCE',
  'MANAGE_SALARY',
  'MANAGE_LEAVES',
  'VIEW_REPORTS',
  'VIEW_HR_DASHBOARD',
  'VIEW_HOSPITALITY',
  'MANAGE_HOSPITALITY',
];

export const isOpsUser = (hasAccess) => Boolean(hasAccess?.(OPS_GATES));
