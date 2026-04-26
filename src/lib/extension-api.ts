export const extensionCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Expose-Headers": "Content-Disposition",
};

export function extensionOptionsResponse() {
  return new Response(null, {
    status: 204,
    headers: extensionCorsHeaders,
  });
}

export function withExtensionCors(response: Response) {
  for (const [key, value] of Object.entries(extensionCorsHeaders)) {
    response.headers.set(key, value);
  }

  return response;
}

export function extensionJson(
  body: Record<string, unknown>,
  init?: ResponseInit,
) {
  return withExtensionCors(Response.json(body, init));
}
