import { beforeEach, describe, expect, it, vi } from "vitest";

const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    from: () => ({ select: mockSelect }),
  })),
}));

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns healthy when bot heartbeat is fresh", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        service_name: "discord-bot",
        last_seen_at: new Date().toISOString(),
        metadata: { guildCount: 5, wsPing: 42 },
      },
      error: null,
    });

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("healthy");
    expect(body.db).toBe("connected");
    expect(body.bot).toBe("online");
    expect(body.botMetadata).toEqual({ guildCount: 5, wsPing: 42 });
    expect(body.responseTime).toBeTypeOf("number");
  });

  it("returns unhealthy when bot heartbeat is stale", async () => {
    const staleTime = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    mockMaybeSingle.mockResolvedValue({
      data: {
        service_name: "discord-bot",
        last_seen_at: staleTime,
        metadata: { guildCount: 5, wsPing: 42 },
      },
      error: null,
    });

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("unhealthy");
    expect(body.db).toBe("connected");
    expect(body.bot).toBe("offline");
  });

  it("returns unhealthy with bot unknown when no heartbeat row exists", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("unhealthy");
    expect(body.db).toBe("connected");
    expect(body.bot).toBe("unknown");
    expect(body.botLastSeenAt).toBeNull();
  });

  it("returns unhealthy with db error on Supabase failure", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { code: "PGRST301", message: "connection refused" },
    });

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("unhealthy");
    expect(body.db).toBe("error");
    expect(body.bot).toBe("unknown");
  });

  it("sets Cache-Control: no-store header", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();

    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
