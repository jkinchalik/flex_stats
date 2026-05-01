export class RiotApiError extends Error {
  status: number;
  statusText: string;
  bodySnippet: string;
  constructor(status: number, statusText: string, bodySnippet: string) {
    super(`Riot API error ${status} ${statusText}: ${bodySnippet}`);
    this.name = "RiotApiError";
    this.status = status;
    this.statusText = statusText;
    this.bodySnippet = bodySnippet;
  }
}

export class RiotNotFoundError extends Error {
  status: 404;
  constructor(message = "Riot API: not found") {
    super(message);
    this.name = "RiotNotFoundError";
    this.status = 404;
  }
}

function parseAppRateLimit(): { count: number; windowMs: number } {
  const raw = process.env.RIOT_APP_RATE_LIMIT;
  if (!raw) return { count: 100, windowMs: 120_000 };
  const [c, s] = raw.split(":").map((x) => Number.parseInt(x, 10));
  if (!Number.isFinite(c) || !Number.isFinite(s) || c <= 0 || s <= 0) {
    return { count: 100, windowMs: 120_000 };
  }
  return { count: c, windowMs: s * 1000 };
}

const { count: APP_LIMIT_COUNT, windowMs: APP_LIMIT_WINDOW_MS } = parseAppRateLimit();

const recentCalls: number[] = [];
let queueTail: Promise<void> = Promise.resolve();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireToken(): Promise<void> {
  const run = async () => {
    while (true) {
      const now = Date.now();
      while (recentCalls.length > 0 && recentCalls[0] <= now - APP_LIMIT_WINDOW_MS) {
        recentCalls.shift();
      }
      if (recentCalls.length < APP_LIMIT_COUNT) {
        recentCalls.push(Date.now());
        return;
      }
      const oldest = recentCalls[0];
      const waitMs = Math.max(0, oldest + APP_LIMIT_WINDOW_MS - now);
      await sleep(waitMs + 1);
    }
  };
  const prev = queueTail;
  let release!: () => void;
  queueTail = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    await prev;
    await run();
  } finally {
    release();
  }
}

function getApiKey(): string {
  const key = process.env.RIOT_API_KEY;
  if (!key) {
    throw new Error("RIOT_API_KEY environment variable is not set");
  }
  return key;
}

function getHostSubdomain(host: "platform" | "regional"): string {
  if (host === "platform") {
    return process.env.RIOT_PLATFORM ?? "na1";
  }
  return process.env.RIOT_REGION ?? "americas";
}

const BACKOFF_5XX_MS = [250, 750, 2000];
const MAX_RETRIES = 3;

export async function riotFetch<T>(host: "platform" | "regional", path: string): Promise<T> {
  const apiKey = getApiKey();
  const sub = getHostSubdomain(host);
  const url = `https://${sub}.api.riotgames.com${path}`;

  let attempt = 0;
  while (true) {
    await acquireToken();
    const res = await fetch(url, {
      headers: {
        "X-Riot-Token": apiKey,
      },
    });

    if (res.ok) {
      return (await res.json()) as T;
    }

    if (res.status === 404) {
      throw new RiotNotFoundError(`Riot API 404 at ${path}`);
    }

    if (res.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = Number.parseInt(res.headers.get("Retry-After") ?? "1", 10);
      const waitMs = (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 1) * 1000;
      attempt++;
      await sleep(waitMs);
      continue;
    }

    if (res.status >= 500 && res.status < 600 && attempt < MAX_RETRIES) {
      const waitMs = BACKOFF_5XX_MS[Math.min(attempt, BACKOFF_5XX_MS.length - 1)];
      attempt++;
      await sleep(waitMs);
      continue;
    }

    const bodyText = await res.text().catch(() => "");
    throw new RiotApiError(res.status, res.statusText, bodyText.slice(0, 500));
  }
}
