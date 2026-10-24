import React, { createContext, useState, useContext, useEffect } from 'react';
import { clearSupportSession, readSupportSession, writeSupportSession } from '../helpers/supportSession';
import { apiService } from '../api/apiService';

const AuthContext = createContext();

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    localStorage.removeItem('user');
    return null;
  }
};

const isPlatformUser = (user) => user?.principalType === 'PLATFORM';

const hasOpsRole = (user, role) => {
  if (!user) return false;
  if (user.opsRole === role) return true;
  return Array.isArray(user.roles) && user.roles.includes(role);
};

export const AuthProvider = ({ children }) => {
  const supportUser = readSupportSession();
  const initialUser = supportUser || readStoredUser();
  
  const [tenantId, setTenantId] = useState(initialUser?.tenantId || null);
  const [storeId, setStoreId] = useState(initialUser?.storeId || null);
  
  const [token, setToken] = useState(supportUser?.token || localStorage.getItem('jwtToken') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(supportUser?.token || localStorage.getItem('jwtToken')));
  const [user, setUser] = useState(initialUser);

  const login = (userData, options = {}) => {
    const support = Boolean(options.support || userData?.supportSession);
    const nextUser = support ? { ...userData, supportSession: true } : userData;
    setIsAuthenticated(true);
    setUser(nextUser);
    setToken(userData.token);
    setTenantId(userData.tenantId);
    setStoreId(userData.storeId);
    if (support) {
      writeSupportSession(nextUser);
      return;
    }
    localStorage.setItem('jwtToken', userData.token);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const applySession = (session) => {
    if (session.tenantId != null) setTenantId(session.tenantId);
    if (session.storeId != null) setStoreId(session.storeId);
    setUser((current) => {
      if (!current || current.supportSession || isPlatformUser(current)) return current;
      const next = {
        ...current,
        roles: session.roles || current.roles,
        firstName: session.firstName ?? current.firstName,
        lastName: session.lastName ?? current.lastName,
        username: session.username ?? current.username,
        staffId: session.staffId ?? current.staffId,
        tenantId: session.tenantId ?? current.tenantId,
        storeId: session.storeId ?? current.storeId,
        active: session.active,
      };
      try {
        const stored = JSON.parse(localStorage.getItem('user') || 'null') || {};
        localStorage.setItem('user', JSON.stringify({ ...stored, ...next }));
      } catch {
        // keep memory state if storage is unavailable
      }
      return next;
    });
  };

  useEffect(() => {
    if (!isAuthenticated || !token || user?.supportSession || isPlatformUser(user)) return undefined;
    let cancelled = false;
    const refresh = async () => {
      try {
        const session = await apiService.get('/session');
        if (cancelled || !session?.success) return;
        if (session.active === false) {
          logout();
          return;
        }
        applySession(session);
      } catch {
        // JwtAuthFilter already rejects revoked sessions with 401.
      }
    };
    refresh();
    const onVis = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [isAuthenticated, token]);

  const logout = () => {
    const support = Boolean(user?.supportSession || readSupportSession());
    const platform = isPlatformUser(user);
    setIsAuthenticated(false);
    setUser(null);
    setToken('');
    setTenantId(null);
    setStoreId(null);
    if (support) {
      clearSupportSession();
      const stored = readStoredUser();
      const storedToken = localStorage.getItem('jwtToken');
      if (stored && storedToken) {
        setIsAuthenticated(true);
        setUser(stored);
        setToken(storedToken);
        setTenantId(stored.tenantId || null);
        setStoreId(stored.storeId || null);
        return isPlatformUser(stored) ? '/ops' : '/home';
      }
      return '/ops/support-ended';
    }
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('user');
    return platform ? '/ops/login' : '/login';
  };

  const hasAccess = (requiredPerms) => {
    if (!user || !user.roles) return false;
    return user.roles.some(roleOrPerm => requiredPerms.includes(roleOrPerm));
  };

  const isSupportSession = Boolean(user?.supportSession);
  const isPlatform = !isSupportSession && isPlatformUser(user);
  const isSuperAdmin = hasOpsRole(user, 'SUPERADMIN');
  const isSales = hasOpsRole(user, 'SALES');

  return (
    <AuthContext.Provider value={{ 
      tenantId, setTenantId, 
      storeId, setStoreId, 
      token, setToken,
      isAuthenticated, user,
      login, logout, hasAccess,
      isPlatform, isSuperAdmin, isSales, isSupportSession
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
