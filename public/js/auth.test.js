// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  extractErrorFromSearch,
  extractTokenFromHash,
  getAuthState,
  getErrorMessage,
  getStoredToken,
  isTokenExpired,
} from "./auth.js";

const makeJwt = (payload) => {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
};

const resetUrl = () => window.history.replaceState({}, "", "/");
const setHashInUrl = (value) =>
  window.history.replaceState({}, "", `/#${value}`);
const replaceQuery = (name, value) =>
  window.history.replaceState({}, "", `?${name}=${value}`);

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  resetUrl();
});

describe("extractTokenFromHash", () => {
  it("extracts JWT from window.location.hash when hash is #token=<jwt>", () => {
    const jwt = makeJwt({ sub: "u1", exp: 9999999999 });
    setHashInUrl(`token=${jwt}`);

    const result = extractTokenFromHash();

    expect(result).toBe(jwt);
  });

  it("stores extracted token in sessionStorage under key 'access_token'", () => {
    const jwt = makeJwt({ sub: "u1", exp: 9999999999 });
    setHashInUrl(`token=${jwt}`);

    extractTokenFromHash();

    expect(sessionStorage.getItem("access_token")).toBe(jwt);
  });

  it("clears hash from URL via window.history.replaceState without page reload", () => {
    const jwt = makeJwt({ sub: "u1", exp: 9999999999 });
    setHashInUrl(`token=${jwt}`);
    const spy = vi.spyOn(window.history, "replaceState");

    extractTokenFromHash();

    expect(spy).toHaveBeenCalled();
    expect(window.location.hash).toBe("");
  });
});

describe("extractErrorFromSearch", () => {
  it("detects ?error= in window.location.search and returns error code string", () => {
    replaceQuery("error", "access_denied");

    const result = extractErrorFromSearch();

    expect(result).toBe("access_denied");
  });

  it("clears ?error= from URL via window.history.replaceState", () => {
    replaceQuery("error", "access_denied");

    const spy = vi.spyOn(window.history, "replaceState");

    extractErrorFromSearch();

    expect(spy).toHaveBeenCalled();
    expect(window.location.search).toBe("");
  });

  it("returns null when no ?error= param present", () => {
    expect(extractErrorFromSearch()).toBeNull();
  });
});

describe("getStoredToken", () => {
  it("reads and returns token from sessionStorage when no hash present", () => {
    const jwt = makeJwt({ sub: "u1", exp: 9999999999 });
    sessionStorage.setItem("access_token", jwt);

    expect(getStoredToken()).toBe(jwt);
  });

  it("returns null from getStoredToken() when sessionStorage is empty", () => {
    expect(getStoredToken()).toBeNull();
  });
});

describe("isTokenExpired", () => {
  it("returns true when JWT exp claim is in the past", () => {
    const jwt = makeJwt({ sub: "u1", exp: 1 }); // epoch 1 = very past
    expect(isTokenExpired(jwt)).toBe(true);
  });

  it("returns false when JWT exp claim is in the future", () => {
    const jwt = makeJwt({ sub: "u1", exp: 9999999999 });
    expect(isTokenExpired(jwt)).toBe(false);
  });
});

describe("getAuthState — session restore", () => {
  it("returns authenticated when sessionStorage has a valid non-expired token", async () => {
    const jwt = makeJwt({ sub: "u1", exp: 9999999999 });
    sessionStorage.setItem("access_token", jwt);

    const state = await getAuthState();

    expect(state).toEqual({ status: "authenticated", token: jwt });
  });

  it("calls POST /auth/refresh and stores token when sessionStorage is empty and refresh succeeds", async () => {
    const jwt = makeJwt({ sub: "u1", exp: 9999999999 });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ accessToken: jwt }),
    });

    const state = await getAuthState();

    expect(global.fetch).toHaveBeenCalledWith(
      "/auth/refresh",
      expect.objectContaining({ method: "POST" }),
    );
    expect(sessionStorage.getItem("access_token")).toBe(jwt);
    expect(state).toEqual({ status: "authenticated", token: jwt });
  });

  it("returns unauthenticated when sessionStorage is empty and POST /auth/refresh returns 401", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    });

    const state = await getAuthState();

    expect(state).toEqual({ status: "unauthenticated" });
  });
});

describe("extractErrorFromSearch — US2 specifics", () => {
  it("returns 'access_denied' for ?error=access_denied", () => {
    replaceQuery("error", "access_denied");
    expect(extractErrorFromSearch()).toBe("access_denied");
  });

  it("returns 'server_error' for ?error=server_error", () => {
    replaceQuery("error", "server_error");
    expect(extractErrorFromSearch()).toBe("server_error");
  });

  it("returns null when no ?error= is present", () => {
    expect(extractErrorFromSearch()).toBeNull();
  });
});

describe("getErrorMessage", () => {
  it("returns human-readable string for 'access_denied'", () => {
    expect(getErrorMessage("access_denied")).toBe(
      "Sign-in was cancelled. Please try again.",
    );
  });

  it("returns a non-empty, non-technical string for 'server_error'", () => {
    const msg = getErrorMessage("server_error");
    expect(typeof msg).toBe("string");
    expect(msg.length).toBeGreaterThan(0);
    expect(msg).not.toMatch(/server_error/i);
  });

  it("returns null for null input", () => {
    expect(getErrorMessage(null)).toBeNull();
  });
});
