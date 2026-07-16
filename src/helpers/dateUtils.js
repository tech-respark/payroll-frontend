/**
 * Helper to format ISO dates or timestamps based on the store config.
 * 
 * @param {string|number|Date} dateVal - The date to format
 * @param {string} format - The configured format string (e.g., 'dd-MM-yyyy')
 * @returns {string} - The formatted date string
 */
export const formatDateByConfig = (dateVal, format = 'dd-MM-yyyy') => {
  if (!dateVal) return '-';
  
  // Handle strings safely, replacing slashes in case we receive old backend formats
  let safeDateVal = dateVal;
  if (typeof dateVal === 'string') {
    safeDateVal = dateVal.replace(/\//g, ' ');
  }
  
  const d = new Date(safeDateVal);
  if (isNaN(d.getTime())) return String(dateVal); // Fallback to raw string if invalid
  
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
