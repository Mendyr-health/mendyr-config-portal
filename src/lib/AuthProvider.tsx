"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { login as apiLogin } from "./api";
import { decodeJwtPayload } from "./jwt";
import { tokenStore } from "./tokenStore";
import type { AccessTokenClaims } from "./types";

interface AuthState {
  /** Undefined while the initial sessionStorage read is in flight (avoids a flash of the
   * wrong screen); null once we know there's no valid session. */
  role: string | null | undefined;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const token = tokenStore.getAccessToken();
    const claims = token ? decodeJwtPayload<AccessTokenClaims>(token) : null;
    setRole(claims?.role ?? null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      role,
      isAdmin: role === "admin",
      login: async (email: string, password: string) => {
        const tokens = await apiLogin(email, password);
        tokenStore.setTokens(tokens);
        const claims = decodeJwtPayload<AccessTokenClaims>(tokens.access_token);
        setRole(claims?.role ?? null);
      },
      logout: () => {
        tokenStore.clear();
        setRole(null);
      },
    }),
    [role]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
