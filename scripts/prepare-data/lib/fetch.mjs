import { setTimeout as delay } from 'node:timers/promises';

export class PrepareError extends Error {
  constructor(message, context) {
    super(message);
    this.name = 'PrepareError';
    this.context = context;
  }
}

/**
 * Fetch with retry and an explicit timeout. Never swallows a failure:
 * exhausted retries throw, because a silently-missing source would
 * otherwise become a silently-missing indicator in the published atlas.
 */
export async function fetchWithRetry(url, { attempts = 4, timeoutMs = 180_000, accept } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'respira-atlas-data-prep/0.1',
          ...(accept ? { Accept: accept } : {}),
        },
      });
      if (!response.ok) {
        throw new PrepareError(`HTTP ${response.status} ${response.statusText}`, { url });
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await delay(800 * attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new PrepareError(`Failed after ${attempts} attempts: ${lastError?.message}`, { url });
}

export async function fetchJson(url, options) {
  const response = await fetchWithRetry(url, { ...options, accept: 'application/json' });
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new PrepareError('Response was not valid JSON', { url, head: text.slice(0, 300) });
  }
}

export async function fetchText(url, options) {
  const response = await fetchWithRetry(url, options);
  return response.text();
}
