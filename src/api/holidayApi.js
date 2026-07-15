import { apiService } from './apiService';

// Note: The base url from apiService is '/payroll-management/v1', but our endpoint is '/api/v1/holidays'. 
// We will use fetch directly or adjust the path if apiService allows it. 
// Actually, looking at apiService.js, BASE_URL is prepended. We will override it or just use fetch here.
// Let's just use native fetch to match the project's style without breaking apiService's BASE_URL assumptions.

export const getStoreHolidays = async (tenantId, storeId) => {
  const token = localStorage.getItem('jwtToken');
  const response = await fetch(`/payroll-management/v1/holidays?tenantId=${tenantId}&storeId=${storeId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch holidays');
  return response.json();
};

export const createStoreHoliday = async (holidayData) => {
  const token = localStorage.getItem('jwtToken');
  const response = await fetch(`/payroll-management/v1/holidays`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(holidayData)
  });
  if (!response.ok) throw new Error('Failed to create holiday');
  return response.json();
};

export const deleteStoreHoliday = async (id) => {
  const token = localStorage.getItem('jwtToken');
  const response = await fetch(`/payroll-management/v1/holidays/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to delete holiday');
  return response.json();
};
