"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { authApi, login as apiLogin, SESSION_EXPIRED_EVENT } from "./api";
import { decodeJwtPayload } from "./jwt";
import { tokenStore } from "./tokenStore";
import type { AccessTokenClaims, Me } from "./types";

/** Roles allowed into the portal. `admin` and `super_admin` have full access; `ops` can read
 * everything the backend lets them and act on bookings, but not review professionals,
 * suspend users, edit config or the catalogue (`require_admin` server-side). */
export const PORTAL_ROLES = ["admin", "super_admin", "ops"] as const;

interface AuthState {
  /** Undefined while the initial sessionStorage read is in flight (avoids a flash of the
   * wrong screen); null once we know there's no valid session. */
  role: string | null | undefined;
  me: Me | null;
  /** Any role allowed into the portal. */
  isPortalUser: boolean;
  /** admin / super_admin — may change policy, config, catalogue and verification. */
  canWrite: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function roleFromToken(token: string | null): string | null {
  if (!token) return null;
  const claims = decodeJwtPayload<AccessTokenClaims>(token);
  if (!claims) return null;
  // An expired access token is still usable if the refresh token works, so don't reject it here.
  return claims.role ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<string | null | undefined>(undefined);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    setRole(roleFromToken(tokenStore.getAccessToken()));
    const onExpired = () => {
      setRole(null);
      setMe(null);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const isPortalUser = !!role && (PORTAL_ROLES as readonly string[]).includes(role);

  useEffect(() => {
    if (!isPortalUser) return;
    let cancelled = false;
    authApi
      .me()
      .then((profile) => {
        if (!cancelled) setMe(profile);
      })
      .catch(() => {
        // Name is cosmetic; the header falls back to the role.
      });
    return () => {
      cancelled = true;
    };
  }, [isPortalUser]);

  const logout = useCallback(() => {
    tokenStore.clear();
    setRole(null);
    setMe(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      role,
      me,
      isPortalUser,
      canWrite: role === "admin" || role === "super_admin",
      login: async (email: string, password: string) => {
        const tokens = await apiLogin(email, password);
        tokenStore.setTokens(tokens);
        const r = roleFromToken(tokens.access_token);
        setRole(r);
        return r;
      },
      logout,
    }),
    [role, me, isPortalUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
