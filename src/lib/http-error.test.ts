import { errorMessage, responseErrorMessage } from "~/lib/http-error";

describe("responseErrorMessage", () => {
  it("returns server JSON errors when present", async () => {
    const response = new Response(JSON.stringify({ error: "Invalid secret" }), {
      status: 400,
      statusText: "Bad Request",
      headers: { "Content-Type": "application/json" },
    });

    await expect(
      responseErrorMessage(response, "Request failed"),
    ).resolves.toBe("Invalid secret");
  });

  it("falls back to statusText when JSON parsing fails", async () => {
    const response = new Response("not-json", {
      status: 500,
      statusText: "Internal Server Error",
      headers: { "Content-Type": "application/json" },
    });

    await expect(
      responseErrorMessage(response, "Request failed"),
    ).resolves.toBe("Internal Server Error");
  });
});

describe("errorMessage", () => {
  it("falls back to the provided message for non-Error values", () => {
    expect(errorMessage("boom", "Request failed")).toBe("Request failed");
  });
});
