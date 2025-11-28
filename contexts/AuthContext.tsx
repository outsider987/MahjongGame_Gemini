import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User, LoginInput, RegisterInput, AuthResponse } from '../services/AuthService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<AuthResponse>;
  register: (input: RegisterInput) => Promise<AuthResponse>;
  loginWithLine: () => void;
  logout: () => void;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(authService.getUser());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check for LINE callback token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const lineToken = urlParams.get('token');
    
    if (lineToken) {
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
      // Token would be handled by LINE callback - for now just reload user
    }

    // Load user from storage
    setUser(authService.getUser());
  }, []);

  const login = async (input: LoginInput): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const response = await authService.login(input);
      if (response.success && response.data) {
        setUser(response.data.user);
      }
      return response;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (input: RegisterInput): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const response = await authService.register(input);
      if (response.success && response.data) {
        setUser(response.data.user);
      }
      return response;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithLine = () => {
    window.location.href = authService.getLineLoginUrl();
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const getToken = () => authService.getToken();

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        register,
        loginWithLine,
        logout,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

