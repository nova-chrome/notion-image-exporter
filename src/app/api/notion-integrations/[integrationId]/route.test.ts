import {
  DELETE,
  PATCH,
} from "~/app/api/notion-integrations/[integrationId]/route";
import {
  deleteUserIntegration,
  renameUserIntegration,
} from "~/lib/notion-integrations";
import { getSession } from "~/lib/session";

vi.mock("~/lib/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("~/lib/notion-integrations", () => ({
  deleteUserIntegration: vi.fn(),
  renameUserIntegration: vi.fn(),
}));

describe("/api/notion-integrations/[integrationId]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renames an owned integration", async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: "user_1" },
    } as never);
    vi.mocked(renameUserIntegration).mockResolvedValue({
      id: "int_1",
      label: "Renamed",
    } as never);

    const response = await PATCH(
      new Request("http://localhost/api/notion-integrations/int_1", {
        method: "PATCH",
        body: JSON.stringify({ label: "Renamed" }),
      }),
      { params: Promise.resolve({ integrationId: "int_1" }) },
    );

    expect(response.status).toBe(200);
    expect(renameUserIntegration).toHaveBeenCalledWith({
      userId: "user_1",
      integrationId: "int_1",
      label: "Renamed",
    });
  });

  it("returns not found when deleting an integration owned by someone else or missing", async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: "user_1" },
    } as never);
    vi.mocked(deleteUserIntegration).mockResolvedValue(null);

    const response = await DELETE(
      new Request("http://localhost/api/notion-integrations/int_1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ integrationId: "int_1" }) },
    );

    expect(response.status).toBe(404);
  });
});
