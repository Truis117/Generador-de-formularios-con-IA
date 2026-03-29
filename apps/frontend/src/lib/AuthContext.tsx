import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "./apiClient";

interface AuthState {
  isAuthenticated: boolean;
  login: (access: string, refresh: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(api.hasRefreshToken);

  const login = (access: string, refresh: string) => {
    api.setTokens(access, refresh);
    setIsAuthenticated(true);
  };

  const logout = () => {
    api.clearTokens();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
