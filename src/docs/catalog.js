export const DOCS_NAV = [
  {
    id: 'start',
    title: 'Get started',
    items: [
      {
        slug: 'introduction',
        title: 'Introduction',
        description: 'What Relfor Payroll helps you do, and how this guide is organized.',
        keywords: ['overview', 'home', 'start', 'help'],
      },
      {
        slug: 'sign-in',
        title: 'Sign in',
        description: 'Open the app, sign in, and reset a forgotten password.',
        keywords: ['login', 'password', 'otp', 'forgot'],
      },
      {
        slug: 'find-your-way',
        title: 'Find your way around',
        description: 'Sidebar, search, account menu, and how screens appear for your role.',
        keywords: ['navigation', 'sidebar', 'command', 'theme', 'search'],
      },
      {
        slug: 'home',
        title: 'Home',
        description: 'The first screen after sign-in: your day, or the queues that need a decision.',
        keywords: ['dashboard', 'today', 'overview', 'landing'],
      },
    ],
  },
  {
    id: 'everyone',
    title: 'Everyday work',
    items: [
      {
        slug: 'profile',
        title: 'Your profile',
        description: 'View and update your staff record, documents, and work history.',
        keywords: ['staff', 'employee', 'bank', 'documents'],
      },
      {
        slug: 'attendance',
        title: 'Attendance',
        description: 'Read your monthly calendar, punches, and day status.',
        keywords: ['calendar', 'punch', 'present', 'absent', 'late'],
      },
      {
        slug: 'regularize',
        title: 'Correct a punch',
        description: 'Request a regularization when a punch is missing or wrong.',
        keywords: ['regularization', 'correction', 'missed punch'],
      },
      {
        slug: 'my-work',
        title: 'Clock in and My Work',
        description: 'Clock in or out, set availability, and request a shift swap.',
        keywords: ['clock', 'swap', 'availability', 'roster'],
      },
      {
        slug: 'leave',
        title: 'Leave',
        description: 'Check balances, apply for leave, and cancel a request.',
        keywords: ['pto', 'vacation', 'sick', 'balance', 'apply'],
      },
      {
        slug: 'payslips',
        title: 'Payslips',
        description: 'Open a month, print, or download your payslip PDF.',
        keywords: ['salary slip', 'pdf', 'pay'],
      },
      {
        slug: 'claims',
        title: 'Claims',
        description: 'Submit reimbursements and IT declarations.',
        keywords: ['reimbursement', 'declaration', '80c', 'hra'],
      },
    ],
  },
  {
    id: 'managers',
    title: 'Managers',
    items: [
      {
        slug: 'approve-attendance',
        title: 'Approve attendance',
        description: 'Review pending punch corrections for your team.',
        keywords: ['approvals', 'regularization', 'reject'],
      },
      {
        slug: 'approve-leave',
        title: 'Approve leave',
        description: 'Approve or reject leave and cancellation requests.',
        keywords: ['leave approvals', 'manager', 'pending'],
      },
      {
        slug: 'shifts',
        title: 'Shifts and roster',
        description: 'Maintain shift templates, assign the roster, and read the week view.',
        keywords: ['schedule', 'template', 'store hours', 'weekly'],
      },
    ],
  },
  {
    id: 'hr',
    title: 'HR and admin',
    items: [
      {
        slug: 'staff',
        title: 'Staff directory',
        description: 'Find people, create records, and keep employment details current.',
        keywords: ['employees', 'directory', 'onboarding'],
      },
      {
        slug: 'roles',
        title: 'Roles and permissions',
        description: 'Create roles, choose permissions, and assign them at a store.',
        keywords: ['access', 'authority', 'permissions'],
      },
      {
        slug: 'leave-policies',
        title: 'Leave policies',
        description: 'Configure leave types, plans, enrollment, and balances.',
        keywords: ['accrual', 'plan', 'rules', 'types'],
      },
      {
        slug: 'holidays',
        title: 'Holiday calendar',
        description: 'Publish store holidays that attendance and leave can use.',
        keywords: ['public holiday', 'optional holiday'],
      },
      {
        slug: 'hr-dashboard',
        title: 'HR dashboard',
        description: 'See workforce, attendance, and leave metrics at a glance.',
        keywords: ['executive', 'headcount', 'metrics'],
      },
      {
        slug: 'activity-log',
        title: 'Activity log',
        description: 'See who changed staff, leave, payroll, and other store records.',
        keywords: ['audit', 'history', 'who changed', 'events'],
      },
    ],
  },
  {
    id: 'payroll',
    title: 'Payroll',
    items: [
      {
        slug: 'salary',
        title: 'Salary setup',
        description: 'Set fixed pay and monthly variables before a payroll run.',
        keywords: ['compensation', 'components', 'formula'],
      },
      {
        slug: 'pay-run',
        title: 'Pay run',
        description: 'Calculate, skip people, approve, publish, and lock a payroll period.',
        keywords: ['calculate', 'approve', 'publish', 'statutory', 'form 16'],
      },
      {
        slug: 'loans',
        title: 'Loans',
        description: 'Record a loan and recover the EMI on the pay run.',
        keywords: ['emi', 'loan', 'advance'],
      },
      {
        slug: 'settlements',
        title: 'Settlements',
        description: 'Draft and close a full and final settlement.',
        keywords: ['fnf', 'exit', 'full and final'],
      },
      {
        slug: 'hospitality',
        title: 'Hospitality payroll',
        description: 'Advances, commissions, service charge, statutory lines, and exports.',
        keywords: ['tips', 'commission', 'advance', 'fnf', 'pf', 'neft'],
      },
      {
        slug: 'reports',
        title: 'Reports',
        description: 'Attendance summary, staff detail, payroll cost, and CSV export.',
        keywords: ['analytics', 'csv', 'hours'],
      },
    ],
  },
  {
    id: 'reference',
    title: 'Reference',
    items: [
      {
        slug: 'glossary',
        title: 'Glossary',
        description: 'Shared words used across the product.',
        keywords: ['terms', 'definitions', 'status'],
      },
      {
        slug: 'faq',
        title: 'FAQ',
        description: 'Answers to common questions and what to do when something looks wrong.',
        keywords: ['help', 'troubleshoot', 'why'],
      },
    ],
  },
];

export const DOCS_PAGES = DOCS_NAV.flatMap((section) =>
  section.items.map((item) => ({
    ...item,
    sectionId: section.id,
    sectionTitle: section.title,
  }))
);

export const HOME_CARDS = [
  {
    slug: 'home',
    title: 'Home',
    description: 'See your day, or the queues that need a decision.',
    icon: 'map',
  },
  {
    slug: 'sign-in',
    title: 'Sign in',
    description: 'Open the app and recover access if you forget your password.',
    icon: 'rocket',
  },
  {
    slug: 'find-your-way',
    title: 'Find your way around',
    description: 'Learn the sidebar, search, and account menu.',
    icon: 'map',
  },
  {
    slug: 'attendance',
    title: 'Attendance',
    description: 'Read your calendar and request a punch correction.',
    icon: 'calendar',
  },
  {
    slug: 'leave',
    title: 'Leave',
    description: 'Check balances and apply for time off.',
    icon: 'leave',
  },
  {
    slug: 'payslips',
    title: 'Payslips',
    description: 'Open, print, or download a month.',
    icon: 'payslip',
  },
  {
    slug: 'shifts',
    title: 'Shifts and roster',
    description: 'Build templates and assign the week.',
    icon: 'shifts',
  },
];

export function getDocPage(slug) {
  const key = !slug || slug === 'introduction' ? 'introduction' : slug;
  return DOCS_PAGES.find((page) => page.slug === key) || null;
}

export function getAdjacentPages(slug) {
  const key = !slug || slug === 'introduction' ? 'introduction' : slug;
  const index = DOCS_PAGES.findIndex((page) => page.slug === key);
  if (index < 0) return { prev: null, next: null };
  return {
    prev: index > 0 ? DOCS_PAGES[index - 1] : null,
    next: index < DOCS_PAGES.length - 1 ? DOCS_PAGES[index + 1] : null,
  };
}

export function slugifyHeading(text) {
  return String(text)
    .toLowerCase()
    .replace(/[`*_]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}
