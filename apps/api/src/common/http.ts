export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    body: string,
  ) {
    super(`HTTP ${status} for ${url}: ${body.slice(0, 200)}`);
  }
}

export interface FetchJsonOptions {
  init?: RequestInit;
  timeoutMs?: number;
  /** Extra attempts after the first one, for 429/5xx and network errors. */
  retries?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isRetryable(error: unknown): boolean {
  if (error instanceof HttpError) {
    return error.status === 429 || error.status >= 500;
  }
  // Network failures and timeouts surface as TypeError / DOMException.
  return true;
}

/** `fetch` + JSON parsing with a timeout and exponential backoff retries. */
export async function fetchJson<T>(
  url: string,
  { init, timeoutMs = 10_000, retries = 3 }: FetchJsonOptions = {},
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        throw new HttpError(res.status, url, await res.text());
      }
      return (await res.json()) as T;
    } catch (error) {
      if (attempt >= retries || !isRetryable(error)) throw error;
      await sleep(500 * 2 ** attempt);
    }
  }
}
