import { parseLocalDate } from './dateUtils';

export const formatDisplayDate = (value) => {
  const date = parseLocalDate(value);
  if (!date) return value || '—';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatActivitySummary = (value) => String(value || '')
  .replace(/\b1 days\b/gi, '1 day')
  .replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (iso) => formatDisplayDate(iso));

export const formatDisplayWeekday = (value) => {
  const date = parseLocalDate(value);
  if (!date) return '';
  return date.toLocaleDateString('en-IN', { weekday: 'short' });
};

export const formatClock = (value) => {
  if (!value) return '—';
  const [hours, minutes] = String(value).substring(0, 5).split(':').map(Number);
  if (Number.isNaN(hours)) return value;
  return new Date(2000, 0, 1, hours, minutes || 0).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const formatSlot = (slot) => {
  if (!slot) return '';
  const [from, to] = String(slot).split(/[-–]/).map((part) => part.trim());
  if (!to) return formatClock(from);
  return `${formatClock(from)}–${formatClock(to)}`;
};

export const titleCase = (value) => {
  const raw = String(value || '').replace(/_/g, ' ').trim().toLowerCase();
  if (!raw) return '';
  return raw.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const prettyStatus = (status) => {
  const map = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CANCELLATION_REQUESTED: 'Cancel requested',
    DRAFT: 'Draft',
    CALCULATED: 'Calculated',
    PENDING_APPROVAL: 'Pending approval',
    PUBLISHED: 'Published',
    LOCKED: 'Locked',
    SETTLED: 'Settled',
    CLOSED: 'Closed',
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    UNASSIGNED: 'Unassigned',
    EARNING: 'Earning',
    DEDUCTION: 'Deduction',
    MONTHLY: 'Monthly',
    NONE: 'None',
  };
  return map[status] || titleCase(status) || '—';
};

export const staffName = (staff) => {
  if (!staff) return '—';
  const full = `${staff.firstName || ''} ${staff.lastName || ''}`.trim();
  return full || staff.name || staff.username || `Staff ${staff.id}`;
};

export const staffNameById = (staffList, id) => {
  if (id == null || id === '') return '—';
  const staff = (staffList || []).find((item) => String(item.id || item.staffId) === String(id));
  return staff ? staffName(staff) : `Staff ${id}`;
};

export const formatMoney = (value) => Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatCount = (value) => {
  const n = Number(value || 0);
  return Number.isInteger(n) ? String(n) : n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatSlipDate = (value) => {
  const date = parseLocalDate(value);
  if (!date) return value || '—';
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

export const formatPayPeriod = (value) => {
  const parts = String(value || '').split(/\s+to\s+/i);
  if (parts.length === 2) {
    return `${formatSlipDate(parts[0])} – ${formatSlipDate(parts[1])}`;
  }
  return value || '—';
};

export const maskAccountNumber = (value) => {
  const digits = String(value || '').replace(/\s+/g, '');
  if (!digits) return '';
  if (digits.length <= 4) return digits;
  return `${'•'.repeat(Math.min(digits.length - 4, 8))}${digits.slice(-4)}`;
};
