export const BASE_URL = '/payroll-management/v1';


const handleResponse = async (response, endpoint) => {
  if ((response.status === 401 || response.status === 403) && !endpoint.includes('/login')) {
    // Token is expired or invalid
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }
  if (!response.ok && response.status !== 401) {
    let errorMessage = 'Network response was not ok';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
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
      const token = localStorage.getItem('jwtToken');
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
      const token = localStorage.getItem('jwtToken');
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
  }
};
