const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const parseLockDate = (raw) => {
  if (!raw) return null;
  const parts = String(raw).slice(0, 10).split('-').map(Number);
  if (parts.length < 2 || !parts[0] || !parts[1]) return null;
  return { year: parts[0], monthNumber: parts[1], monthIndex: parts[1] - 1 };
};

const isOnOrBefore = (year, monthNumber, boundary) => {
  if (!boundary) return false;
  return year < boundary.year || (year === boundary.year && monthNumber <= boundary.monthNumber);
};

/**
 * Shared payroll period rules.
 * Read (payslips): locked months stay readable. Months after the attendance
 * summary cursor are not generated yet.
 * Write (monthly variables): locked through the store lock date.
 */
export function periodState({ year, monthNumber, payrollLockedUpToDate, recentSummaryCalculatedMonth }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const lock = parseLockDate(payrollLockedUpToDate);
  const recent = Number(recentSummaryCalculatedMonth) || 0;
  const locked = isOnOrBefore(year, monthNumber, lock);
  const notSummarized = year > currentYear
    || (year === currentYear && recent > 0 && monthNumber > recent);

  let writeReason = '';
  if (locked) {
    writeReason = `Payroll is locked through ${payrollLockedUpToDate}. Open a later month to edit.`;
  }

  let readReason = '';
  if (notSummarized) {
    readReason = `${MONTHS[monthNumber - 1] || 'This month'} ${year} has not been calculated yet.`;
  }

  return {
    locked,
    notSummarized,
    canRead: !notSummarized,
    canWriteVariables: !locked,
    writeReason,
    readReason,
  };
}

export const PAY_MONTH_KEYS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

export function previousPayPeriod(now = new Date()) {
  const monthIndex = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  return { month: PAY_MONTH_KEYS[monthIndex], year };
}

export { MONTHS };
