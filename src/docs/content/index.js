import introduction from './introduction.md?raw';
import signIn from './sign-in.md?raw';
import findYourWay from './find-your-way.md?raw';
import home from './home.md?raw';
import profile from './profile.md?raw';
import attendance from './attendance.md?raw';
import regularize from './regularize.md?raw';
import myWork from './my-work.md?raw';
import leave from './leave.md?raw';
import payslips from './payslips.md?raw';
import approveAttendance from './approve-attendance.md?raw';
import approveLeave from './approve-leave.md?raw';
import shifts from './shifts.md?raw';
import staff from './staff.md?raw';
import roles from './roles.md?raw';
import leavePolicies from './leave-policies.md?raw';
import holidays from './holidays.md?raw';
import hrDashboard from './hr-dashboard.md?raw';
import salary from './salary.md?raw';
import payRun from './pay-run.md?raw';
import claims from './claims.md?raw';
import loans from './loans.md?raw';
import settlements from './settlements.md?raw';
import hospitality from './hospitality.md?raw';
import reports from './reports.md?raw';
import activityLog from './activity-log.md?raw';
import glossary from './glossary.md?raw';
import faq from './faq.md?raw';

export const PAGE_CONTENT = {
  introduction,
  'sign-in': signIn,
  'find-your-way': findYourWay,
  home,
  profile,
  attendance,
  regularize,
  'my-work': myWork,
  leave,
  payslips,
  'approve-attendance': approveAttendance,
  'approve-leave': approveLeave,
  shifts,
  staff,
  roles,
  'leave-policies': leavePolicies,
  holidays,
  'hr-dashboard': hrDashboard,
  salary,
  'pay-run': payRun,
  claims,
  loans,
  settlements,
  hospitality,
  reports,
  'activity-log': activityLog,
  glossary,
  faq,
};

export function getPageContent(slug) {
  const key = !slug || slug === 'introduction' ? 'introduction' : slug;
  return PAGE_CONTENT[key] || '';
}
