import type { TokenPair } from "./types";

/** sessionStorage-backed token store — deliberately per-tab, not shared/persisted across
 * browser restarts. Simple and adequate for a small internal admin tool; if this portal ever
 * needs to survive a page reload across a long session more gracefully, the access token
 * should be re-derived via a silent refresh on load rather than storing it longer-lived. */
const ACCESS_KEY = "config_portal_access_token";
const REFRESH_KEY = "config_portal_refresh_token";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export const tokenStore = {
  getAccessToken(): string | null {
    if (!isBrowser()) return null;
    return sessionStorage.getItem(ACCESS_KEY);
  },
  getRefreshToken(): string | null {
    if (!isBrowser()) return null;
    return sessionStorage.getItem(REFRESH_KEY);
  },
  setTokens(tokens: TokenPair): void {
    if (!isBrowser()) return;
    sessionStorage.setItem(ACCESS_KEY, tokens.access_token);
    sessionStorage.setItem(REFRESH_KEY, tokens.refresh_token);
  },
  clear(): void {
    if (!isBrowser()) return;
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  },
};
