import { POST } from "~/app/api/notion-images/route";
import { exportNotionImagesZipResponse } from "~/lib/notion-export";
import {
  decryptOwnedIntegrationSecret,
  getOwnedIntegration,
  touchIntegrationLastUsed,
} from "~/lib/notion-integrations";
import { getSession } from "~/lib/session";

vi.mock("~/lib/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("~/lib/notion-integrations", () => ({
  getOwnedIntegration: vi.fn(),
  decryptOwnedIntegrationSecret: vi.fn(),
  touchIntegrationLastUsed: vi.fn(),
}));

vi.mock("~/lib/notion-export", () => ({
  exportNotionImagesZipResponse: vi.fn(),
}));

describe("POST /api/notion-images", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/notion-images", {
        method: "POST",
        body: JSON.stringify({ pageIdOrUrl: "abc", integrationId: "int_1" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("rejects requests without an integration id", async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: "user_1" },
    } as never);

    const response = await POST(
      new Request("http://localhost/api/notion-images", {
        method: "POST",
        body: JSON.stringify({ pageIdOrUrl: "abc" }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects foreign integrations", async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: "user_1" },
    } as never);
    vi.mocked(getOwnedIntegration).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/notion-images", {
        method: "POST",
        body: JSON.stringify({ pageIdOrUrl: "abc", integrationId: "int_1" }),
      }),
    );

    expect(response.status).toBe(404);
  });

  it("exports with an owned integration and updates last used time", async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: "user_1" },
    } as never);
    vi.mocked(getOwnedIntegration).mockResolvedValue({
      id: "int_1",
      encryptedSecret: "encrypted",
    } as never);
    vi.mocked(decryptOwnedIntegrationSecret).mockReturnValue("ntn_secret");
    vi.mocked(exportNotionImagesZipResponse).mockResolvedValue(
      new Response("zip", { status: 200 }),
    );

    const response = await POST(
      new Request("http://localhost/api/notion-images", {
        method: "POST",
        body: JSON.stringify({
          pageIdOrUrl: "https://www.notion.so/example",
          integrationId: "int_1",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(exportNotionImagesZipResponse).toHaveBeenCalledWith({
      secret: "ntn_secret",
      pageIdOrUrl: "https://www.notion.so/example",
    });
    expect(touchIntegrationLastUsed).toHaveBeenCalledWith({
      userId: "user_1",
      integrationId: "int_1",
    });
  });
});
