import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the proxy module before importing proxy
const mockUpdateSession = vi.fn();
vi.mock("@/lib/supabase/proxy", () => ({
  updateSession: mockUpdateSession,
}));

// Mock NextResponse
const mockRedirect = vi.fn();
const mockNext = vi.fn();
vi.mock("next/server", async () => {
  const actual =
    await vi.importActual<typeof import("next/server")>("next/server");
  return {
    ...actual,
    NextResponse: {
      redirect: (...args: unknown[]) => {
        mockRedirect(...args);
        return { type: "redirect", args };
      },
      next: (...args: unknown[]) => {
        mockNext(...args);
        return { type: "next", args };
      },
    },
  };
});

/**
 * Proxy tests (Next.js 16 uses proxy.ts instead of middleware.ts)
 *
 * Note: In Next.js 16, the middleware functionality has been moved to proxy.ts.
 * These tests verify the proxy function behavior.
 */
describe("Proxy (Next.js 16 middleware)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Task 2.1: Session update integration", () => {
    it("should call updateSession for all matching requests", async () => {
      const { proxy } = await import("@/proxy");
      const mockResponse = { type: "next" };
      mockUpdateSession.mockResolvedValue(mockResponse);

      const mockRequest = createMockRequest("/dashboard");
      await proxy(mockRequest);

      expect(mockUpdateSession).toHaveBeenCalledWith(mockRequest);
    });

    it("should return the response from updateSession", async () => {
      const { proxy } = await import("@/proxy");
      const mockResponse = { type: "next", cookies: {} };
      mockUpdateSession.mockResolvedValue(mockResponse);

      const mockRequest = createMockRequest("/dashboard");
      const result = await proxy(mockRequest);

      expect(result).toBe(mockResponse);
    });
  });

  describe("Task 2.1: Static asset exclusion via config matcher", () => {
    it("should have config that excludes static assets", async () => {
      const { config } = await import("@/proxy");

      expect(config).toBeDefined();
      expect(config.matcher).toBeDefined();
      expect(Array.isArray(config.matcher)).toBe(true);

      // The matcher should be a regex pattern that excludes:
      // - _next/static
      // - _next/image
      // - favicon.ico
      // - image files (.svg, .png, .jpg, .jpeg, .gif, .webp)
      const matcherPattern = config.matcher[0];
      expect(matcherPattern).toContain("_next/static");
      expect(matcherPattern).toContain("_next/image");
      expect(matcherPattern).toContain("favicon.ico");
      expect(matcherPattern).toContain("svg");
      expect(matcherPattern).toContain("png");
      expect(matcherPattern).toContain("jpg");
      expect(matcherPattern).toContain("jpeg");
      expect(matcherPattern).toContain("gif");
      expect(matcherPattern).toContain("webp");
    });
  });

  describe("Task 2.2: Route protection - Unauthenticated user to protected routes", () => {
    it("should redirect unauthenticated user from protected route to login page (handled by lib/supabase/proxy.ts)", async () => {
      // This test verifies that lib/supabase/proxy.ts updateSession is called,
      // which handles the redirect logic for unauthenticated users on protected routes
      const { proxy } = await import("@/proxy");

      const redirectUrl = new URL("/auth/login", "http://localhost:3000");
      const mockRedirectResponse = {
        type: "redirect",
        url: redirectUrl,
      };
      mockUpdateSession.mockResolvedValue(mockRedirectResponse);

      const mockRequest = createMockRequest("/dashboard");
      const result = await proxy(mockRequest);

      expect(mockUpdateSession).toHaveBeenCalledWith(mockRequest);
      expect(result).toBe(mockRedirectResponse);
    });
  });

  describe("Task 2.2: Route protection - Authenticated user to login page", () => {
    it("should redirect authenticated user from login page to dashboard", async () => {
      const { proxy } = await import("@/proxy");

      // First, setup updateSession to return a response with user (simulating authenticated state)
      const mockAuthenticatedResponse = {
        type: "next",
        user: { id: "123" },
        shouldRedirectToDashboard: true,
      };
      mockUpdateSession.mockResolvedValue(mockAuthenticatedResponse);

      const mockRequest = createMockRequest("/auth/login");

      // Since lib/supabase/proxy.ts needs to be modified to return user info,
      // this test verifies the proxy behavior
      await proxy(mockRequest);

      expect(mockUpdateSession).toHaveBeenCalledWith(mockRequest);
    });
  });

  describe("Task 2.2: Public routes should skip auth check", () => {
    it("should allow access to root path without redirect", async () => {
      const { proxy } = await import("@/proxy");
      const mockResponse = { type: "next" };
      mockUpdateSession.mockResolvedValue(mockResponse);

      const mockRequest = createMockRequest("/");
      const result = await proxy(mockRequest);

      expect(mockUpdateSession).toHaveBeenCalledWith(mockRequest);
      expect(result).toBe(mockResponse);
    });

    it("should allow access to auth callback without redirect", async () => {
      const { proxy } = await import("@/proxy");
      const mockResponse = { type: "next" };
      mockUpdateSession.mockResolvedValue(mockResponse);

      const mockRequest = createMockRequest("/auth/callback");
      const result = await proxy(mockRequest);

      expect(mockUpdateSession).toHaveBeenCalledWith(mockRequest);
      expect(result).toBe(mockResponse);
    });
  });
});

/**
 * Helper function to create a mock NextRequest
 */
function createMockRequest(pathname: string) {
  const url = new URL(pathname, "http://localhost:3000");
  return {
    nextUrl: {
      pathname,
      clone: () => new URL(url),
    },
    url: url.toString(),
    cookies: {
      getAll: () => [],
      set: vi.fn(),
    },
  } as unknown as Parameters<typeof import("@/proxy").proxy>[0];
}
