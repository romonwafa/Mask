import { API_BASE_URL } from "./config";
import type { ApiStylesResponse, BeardStyle } from "./types";

const CACHE_KEY = "beardai.styles";
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedStyles {
  expiresAt: number;
  styles: BeardStyle[];
}

function readCache(): BeardStyle[] | null {
  try {
    const item = localStorage.getItem(CACHE_KEY);
    if (!item) {
      return null;
    }
    const parsed: CachedStyles = JSON.parse(item);
    if (parsed.expiresAt < Date.now()) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed.styles;
  } catch {
    return null;
  }
}

function writeCache(styles: BeardStyle[]): void {
  try {
    const payload: CachedStyles = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      styles,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors.
  }
}

export async function fetchStyles(forceRefresh = false): Promise<BeardStyle[]> {
  if (!forceRefresh) {
    const cached = readCache();
    if (cached) {
      return cached;
    }
  }

  const response = await fetch(`${API_BASE_URL}/beard/styles`);
  if (!response.ok) {
    throw new Error(`Failed to load beard styles (${response.status}).`);
  }
  const payload = (await response.json()) as ApiStylesResponse;
  writeCache(payload.styles);
  return payload.styles;
}
