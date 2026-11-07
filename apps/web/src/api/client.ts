import type { ApiResponse, HealthDTO } from "@bullish/shared";

export async function getHealth(signal?: AbortSignal): Promise<HealthDTO> {
  const response = await fetch("/api/health", { signal });
  const body = await response.json() as ApiResponse<HealthDTO>;

  if (!body.success) throw new Error(body.error.message);
  if (!response.ok) throw new Error("The server is unavailable.");

  return body.data;
}
