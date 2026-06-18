import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const initialUser = JSON.parse(localStorage.getItem('user') || 'null');
  
  const [tenantId, setTenantId] = useState(initialUser?.tenantId || null);
  const [storeId, setStoreId] = useState(initialUser?.storeId || null);
  
  const [token, setToken] = useState(localStorage.getItem('jwtToken') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('jwtToken'));
  const [user, setUser] = useState(initialUser);

  const login = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    setToken(userData.token);
    setTenantId(userData.tenantId);
    setStoreId(userData.storeId);
    localStorage.setItem('jwtToken', userData.token);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setToken('');
    setTenantId(null);
    setStoreId(null);
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('user');
  };

  const hasAccess = (requiredPerms) => {
    if (!user || !user.roles) return false;
    return user.roles.some(roleOrPerm => requiredPerms.includes(roleOrPerm));
  };

  return (
    <AuthContext.Provider value={{ 
      tenantId, setTenantId, 
      storeId, setStoreId, 
      token, setToken,
      isAuthenticated, user,
      login, logout, hasAccess
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
