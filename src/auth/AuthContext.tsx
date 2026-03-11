import React, { createContext, useContext, useEffect, useState } from "react";
import { clearGitHubTokenCache } from "../api/client";

export interface AuthUser {
  userId: string;
  userDetails: string;
  identityProvider: string;
  userRoles: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  async function fetchUser() {
    try {
      const res = await fetch("/.auth/me");
      if (res.ok) {
        const data = await res.json();
        const clientPrincipal = data.clientPrincipal;
        if (clientPrincipal) {
          setUser({
            userId: clientPrincipal.userId,
            userDetails: clientPrincipal.userDetails,
            identityProvider: clientPrincipal.identityProvider,
            userRoles: clientPrincipal.userRoles ?? [],
          });
        }
      }
    } catch {
      // Not authenticated or SWA auth endpoint not available (local dev)
    } finally {
      setLoading(false);
    }
  }

  const login = () => {
    window.location.href = "/.auth/login/github";
  };

  const logout = () => {
    clearGitHubTokenCache();
    window.location.href = "/.auth/logout";
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
