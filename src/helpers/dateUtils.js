/**
 * Calendar dates from the API are `yyyy-MM-dd`, not instants.
 * Parse them as local civil dates so IST (and any TZ behind UTC) does not shift the day.
 */
export const toLocalDateKey = (value) => {
  if (value == null || value === '') return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const raw = String(value).trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const parsed = new Date(raw.replace(/\//g, ' '));
  if (Number.isNaN(parsed.getTime())) return raw.slice(0, 10);
  return toLocalDateKey(parsed);
};

export const todayLocalKey = () => toLocalDateKey(new Date());

export const addDaysToDateKey = (dateKey, days) => {
  const [y, m, d] = toLocalDateKey(dateKey).split('-').map(Number);
  return toLocalDateKey(new Date(y, m - 1, d + Number(days || 0)));
};

export const parseLocalDate = (value) => {
  const key = toLocalDateKey(value);
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

/**
 * Helper to format ISO dates or timestamps based on the store config.
 * 
 * @param {string|number|Date} dateVal - The date to format
 * @param {string} format - The configured format string (e.g., 'dd-MM-yyyy')
 * @returns {string} - The formatted date string
 */
export const formatDateByConfig = (dateVal, format = 'dd-MM-yyyy') => {
  if (!dateVal) return '-';

  const d = parseLocalDate(dateVal) || new Date(typeof dateVal === 'string' ? dateVal.replace(/\//g, ' ') : dateVal);
  if (isNaN(d.getTime())) return String(dateVal);

  const dd = String(d.getDate()).padStart(2, '0');
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const yy = String(yyyy).slice(-2);
  
  switch (format) {
    case 'dd-MM-yyyy': return `${dd}-${MM}-${yyyy}`;
    case 'MM-dd-yy': return `${MM}-${dd}-${yy}`;
    case 'MM-dd-yyyy': return `${MM}-${dd}-${yyyy}`;
    case 'yyyy-MM-dd': return `${yyyy}-${MM}-${dd}`;
    default: return `${dd}-${MM}-${yyyy}`; // Fallback default
  }
};
