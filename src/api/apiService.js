import { clearSupportSession, currentAuthToken, isSupportAuth } from '../helpers/supportSession';

export const BASE_URL = '/payroll-management/v1';


const handleResponse = async (response, endpoint) => {
  if (response.status === 401 && !endpoint.includes('/login') && !endpoint.includes('/support-handoff')) {
    if (isSupportAuth()) {
      clearSupportSession();
      window.location.href = '/ops/support-ended';
      throw new Error('Support session ended.');
    }
    let platform = false;
    try {
      const stored = JSON.parse(localStorage.getItem('user') || 'null');
      platform = stored?.principalType === 'PLATFORM';
    } catch {
      platform = false;
    }
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('user');
    window.location.href = platform ? '/ops/login' : '/login';
    throw new Error('Session expired. Please log in again.');
  }
  if (!response.ok) {
    let errorMessage = response.status === 403
      ? 'You do not have permission to perform this action.'
      : 'Network response was not ok';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      // Ignored
    }
    throw new Error(errorMessage);
  }
  return await response.json();
};

export const apiService = {
  async get(endpoint, headers = {}) {
    try {
      const token = currentAuthToken();
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...headers
        }
      });
      return await handleResponse(response, endpoint);
    } catch (error) {
      console.error('GET Error:', error);
      throw error;
    }
  },

  async post(endpoint, body, headers = {}) {
    window.dispatchEvent(new Event('api_call_start'));
    try {
      const token = currentAuthToken();
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...headers
        },
        body: JSON.stringify(body)
      });
      return await handleResponse(response, endpoint);
    } catch (error) {
      console.error('POST Error:', error);
      throw error;
    } finally {
      window.dispatchEvent(new Event('api_call_end'));
    }
  },

  async put(endpoint, body, headers = {}) {
    window.dispatchEvent(new Event('api_call_start'));
    try {
      const token = currentAuthToken();
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...headers
        },
        body: JSON.stringify(body)
      });
      return await handleResponse(response, endpoint);
    } catch (error) {
      console.error('PUT Error:', error);
      throw error;
    } finally {
      window.dispatchEvent(new Event('api_call_end'));
    }
  },

  async delete(endpoint, headers = {}) {
    window.dispatchEvent(new Event('api_call_start'));
    try {
      const token = currentAuthToken();
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...headers
        }
      });
      return await handleResponse(response, endpoint);
    } catch (error) {
      console.error('DELETE Error:', error);
      throw error;
    } finally {
      window.dispatchEvent(new Event('api_call_end'));
    }
  }
};

