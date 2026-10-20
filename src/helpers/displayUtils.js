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
