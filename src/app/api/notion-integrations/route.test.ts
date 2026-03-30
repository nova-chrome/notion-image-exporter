import { POST } from "~/app/api/notion-integrations/route";
import {
  createUserIntegration,
  validateNotionIntegrationSecret,
} from "~/lib/notion-integrations";
import { getSession } from "~/lib/session";

vi.mock("~/lib/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("~/lib/notion-integrations", () => ({
  createUserIntegration: vi.fn(),
  validateNotionIntegrationSecret: vi.fn(),
}));

describe("POST /api/notion-integrations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/notion-integrations", {
        method: "POST",
        body: JSON.stringify({ label: "Work", secret: "ntn_secret" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("rejects invalid notion secrets", async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: "user_1" },
    } as never);
    vi.mocked(validateNotionIntegrationSecret).mockResolvedValue({
      valid: false,
      message: "Invalid secret",
    });

    const response = await POST(
      new Request("http://localhost/api/notion-integrations", {
        method: "POST",
        body: JSON.stringify({ label: "Work", secret: "bad_secret" }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("creates integrations for the authenticated user", async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: "user_1" },
    } as never);
    vi.mocked(validateNotionIntegrationSecret).mockResolvedValue({
      valid: true,
    } as never);
    vi.mocked(createUserIntegration).mockResolvedValue({
      id: "int_1",
      label: "Work",
    } as never);

    const response = await POST(
      new Request("http://localhost/api/notion-integrations", {
        method: "POST",
        body: JSON.stringify({ label: "Work", secret: "ntn_secret" }),
      }),
    );

    expect(response.status).toBe(201);
    expect(createUserIntegration).toHaveBeenCalledWith({
      userId: "user_1",
      label: "Work",
      secret: "ntn_secret",
    });
  });

  it("returns a friendly error for duplicate labels on the same user", async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: "user_1" },
    } as never);
    vi.mocked(validateNotionIntegrationSecret).mockResolvedValue({
      valid: true,
    } as never);
    vi.mocked(createUserIntegration).mockRejectedValue(
      new Error("notion_integration_user_label_unique"),
    );

    const response = await POST(
      new Request("http://localhost/api/notion-integrations", {
        method: "POST",
        body: JSON.stringify({ label: "Work", secret: "ntn_secret" }),
      }),
    );

    expect(response.status).toBe(400);
  });
});
