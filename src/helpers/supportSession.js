export const SUPPORT_SESSION_KEY = 'payroll.supportSession';

export const readSupportSession = () => {
  try {
    return JSON.parse(sessionStorage.getItem(SUPPORT_SESSION_KEY) || 'null');
  } catch {
    sessionStorage.removeItem(SUPPORT_SESSION_KEY);
    return null;
  }
};

export const writeSupportSession = (userData) => {
  sessionStorage.setItem(SUPPORT_SESSION_KEY, JSON.stringify({ ...userData, supportSession: true }));
};

export const clearSupportSession = () => {
  sessionStorage.removeItem(SUPPORT_SESSION_KEY);
};

export const currentAuthToken = () => {
  const support = readSupportSession();
  if (support?.token) return support.token;
  return localStorage.getItem('jwtToken');
};

export const isSupportAuth = () => Boolean(readSupportSession()?.token);
