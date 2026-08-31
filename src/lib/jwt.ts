/** Decodes a JWT payload for display/UX purposes only — never trust this for authorization.
 * The signature is not verified here; the backend is the only real enforcement boundary
 * (`require_admin`). This just lets the UI show/hide admin-only actions without a round trip. */
export function decodeJwtPayload<T>(token: string): T | null {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
