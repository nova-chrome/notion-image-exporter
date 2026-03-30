import { tryCatch } from "~/util/try-catch";

type ErrorBody = {
  error?: string;
};

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export async function readJsonBody<T>(response: Response): Promise<T | null> {
  const result = await tryCatch<T, unknown>(response.json() as Promise<T>);
  return result.error === null ? result.data : null;
}

export async function responseErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const body = await readJsonBody<ErrorBody>(response);
  return body?.error || response.statusText || fallback;
}
