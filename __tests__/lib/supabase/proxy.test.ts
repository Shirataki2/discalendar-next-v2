import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
const mockGetClaims = vi.fn();
const mockCreateServerClient = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

// Mock hasEnvVars
vi.mock("@/lib/utils", () => ({
  hasEnvVars: true,
}));

describe("updateSession (proxy.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Setup default mock behavior
    mockCreateServerClient.mockReturnValue({
      auth: {
        getClaims: mockGetClaims,
      },
    });
  });

  describe("Task 2.2: Authenticated user redirect from login page", () => {
    it("should redirect authenticated user from /auth/login to /dashboard", async () => {
      // Mock authenticated user
      mockGetClaims.mockResolvedValue({
        data: { claims: { sub: "user-123" } },
      });

      const { updateSession } = await import("@/lib/supabase/proxy");

      const mockRequest = createMockRequest("/auth/login");
      const result = await updateSession(mockRequest);

      // Should be a redirect response
      expect(result.status).toBe(307);
      expect(result.headers.get("location")).toContain("/dashboard");
    });

    it("should allow authenticated user to access dashboard", async () => {
      // Mock authenticated user
      mockGetClaims.mockResolvedValue({
        data: { claims: { sub: "user-123" } },
      });

      const { updateSession } = await import("@/lib/supabase/proxy");

      const mockRequest = createMockRequest("/dashboard");
      const result = await updateSession(mockRequest);

      // Should NOT be a redirect
      expect(result.status).not.toBe(307);
    });
  });

  describe("Task 2.2: Unauthenticated user redirect to login", () => {
    it("should redirect unauthenticated user from protected route to /auth/login", async () => {
      // Mock unauthenticated user
      mockGetClaims.mockResolvedValue({
        data: { claims: null },
      });

      const { updateSession } = await import("@/lib/supabase/proxy");

      const mockRequest = createMockRequest("/dashboard");
      const result = await updateSession(mockRequest);

      // Should be a redirect response
      expect(result.status).toBe(307);
      expect(result.headers.get("location")).toContain("/auth/login");
    });
  });

  describe("Task 2.2: Public routes should not require auth", () => {
    it("should allow access to root path for unauthenticated users", async () => {
      // Mock unauthenticated user
      mockGetClaims.mockResolvedValue({
        data: { claims: null },
      });

      const { updateSession } = await import("@/lib/supabase/proxy");

      const mockRequest = createMockRequest("/");
      const result = await updateSession(mockRequest);

      // Should NOT be a redirect
      expect(result.status).not.toBe(307);
    });

    it("should allow access to /auth/callback for unauthenticated users", async () => {
      // Mock unauthenticated user
      mockGetClaims.mockResolvedValue({
        data: { claims: null },
      });

      const { updateSession } = await import("@/lib/supabase/proxy");

      const mockRequest = createMockRequest("/auth/callback");
      const result = await updateSession(mockRequest);

      // Should NOT be a redirect
      expect(result.status).not.toBe(307);
    });

    it("should allow access to /auth/login for unauthenticated users", async () => {
      // Mock unauthenticated user
      mockGetClaims.mockResolvedValue({
        data: { claims: null },
      });

      const { updateSession } = await import("@/lib/supabase/proxy");

      const mockRequest = createMockRequest("/auth/login");
      const result = await updateSession(mockRequest);

      // Should NOT be a redirect
      expect(result.status).not.toBe(307);
    });

    it("should allow access to /terms for unauthenticated users", async () => {
      mockGetClaims.mockResolvedValue({
        data: { claims: null },
      });

      const { updateSession } = await import("@/lib/supabase/proxy");

      const mockRequest = createMockRequest("/terms");
      const result = await updateSession(mockRequest);

      expect(result.status).not.toBe(307);
    });

    it("should allow access to /privacy for unauthenticated users", async () => {
      mockGetClaims.mockResolvedValue({
        data: { claims: null },
      });

      const { updateSession } = await import("@/lib/supabase/proxy");

      const mockRequest = createMockRequest("/privacy");
      const result = await updateSession(mockRequest);

      expect(result.status).not.toBe(307);
    });

    it("should allow access to /docs/* for unauthenticated users", async () => {
      mockGetClaims.mockResolvedValue({
        data: { claims: null },
      });

      const { updateSession } = await import("@/lib/supabase/proxy");

      const mockRequest = createMockRequest("/docs/getting-started");
      const result = await updateSession(mockRequest);

      expect(result.status).not.toBe(307);
    });
  });
});

/**
 * Helper function to create a mock NextRequest for testing
 */
function createMockRequest(pathname: string) {
  const baseUrl = "http://localhost:3000";
  const url = new URL(pathname, baseUrl);

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
  } as unknown as import("next/server").NextRequest;
}
