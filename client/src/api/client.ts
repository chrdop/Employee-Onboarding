const BASE_URL = "/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const NETWORK_MESSAGE = "Could not reach the server. Check your connection and try again.";
const SERVER_MESSAGE = "The server ran into a problem. Please try again. If it keeps happening, contact the administrator.";

// Backend validation errors arrive as a JSON string of zod issues; turn them
// into "field: message" text instead of showing raw JSON.
function readableMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((i) => i && typeof i.message === "string")) {
      return parsed
        .map((i) => `${Array.isArray(i.path) && i.path.length > 0 ? `${i.path.join(".")}: ` : ""}${i.message}`)
        .join("; ");
    }
  } catch {
    // not JSON — use the text as is
  }
  return raw;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      credentials: "include",
      headers:
        options.body instanceof FormData
          ? options.headers
          : { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new ApiError(0, NETWORK_MESSAGE);
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.error ?? message;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new ApiError(res.status, res.status >= 500 ? SERVER_MESSAGE : readableMessage(message));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
