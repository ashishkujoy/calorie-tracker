/**
 * auth.js — Client-side authentication utilities
 * Handles token extraction, session storage, refresh, and auth state.
 */

const TOKEN_KEY = "access_token";

/** Reads JWT from URL hash (#token=<jwt>), stores it, clears the hash. Returns token or null. */
export const extractTokenFromHash = () => {
  const hash = window.location.hash;
  if (!hash.startsWith("#token=")) return null;

  const token = hash.slice("#token=".length);
  sessionStorage.setItem(TOKEN_KEY, token);
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  return token;
};

/** Reads ?error= from URL search, clears param, returns error code string or null. */
export const extractErrorFromSearch = () => {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");
  if (!error) return null;

  params.delete("error");
  const newSearch = params.toString() ? "?" + params.toString() : "";
  window.history.replaceState(null, "", window.location.pathname + newSearch);
  return error;
};

/** Returns stored access token from sessionStorage, or null. */
export const getStoredToken = () => sessionStorage.getItem(TOKEN_KEY);

/** Writes token to sessionStorage. */
export const storeToken = (token) => sessionStorage.setItem(TOKEN_KEY, token);

/** Removes token from sessionStorage. */
export const clearToken = () => sessionStorage.removeItem(TOKEN_KEY);

/** Returns true if the JWT's exp claim is in the past. */
export const isTokenExpired = (token) => {
  try {
    const parts = token.split(".");
    const payload = JSON.parse(atob(parts[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

/** Calls POST /auth/refresh. On success stores and returns the new token; on failure returns null. */
export const refreshSession = async () => {
  try {
    const res = await fetch("/auth/refresh", { method: "POST", credentials: "include" });
    if (!res.ok) return null;
    const { accessToken } = await res.json();
    if (!accessToken) return null;
    storeToken(accessToken);
    return accessToken;
  } catch {
    return null;
  }
};

/**
 * Orchestrates the full page-load auth flow:
 *   hash → stored token → refresh → unauthenticated
 */
export const getAuthState = async () => {
  // 1. Token arriving from OAuth callback in hash
  const hashToken = extractTokenFromHash();
  if (hashToken) return { status: "authenticated", token: hashToken };

  // 2. Valid token already in sessionStorage
  const stored = getStoredToken();
  if (stored && !isTokenExpired(stored)) return { status: "authenticated", token: stored };

  // 3. Try silent refresh via httpOnly cookie
  const refreshed = await refreshSession();
  if (refreshed) return { status: "authenticated", token: refreshed };

  return { status: "unauthenticated" };
};

/** Maps OAuth error codes to human-readable messages. Returns null for null input. */
export const getErrorMessage = (code) => {
  if (code === null || code === undefined) return null;
  if (code === "access_denied") return "Sign-in was cancelled. Please try again.";
  return "Something went wrong. Please try again.";
};
