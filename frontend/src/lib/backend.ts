"use client";

const ACCESS_TOKEN_KEY = "rwa_access_token";
const REFRESH_TOKEN_KEY = "rwa_refresh_token";

export function getBackendUrl() {
  const raw = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
  return raw.replace(/\/+$/, "");
}

export function storeTokens(tokens: { accessToken: string; refreshToken: string }) {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function apiFetch<T>(path: string, options: RequestInit = {}) {
  const url = `${getBackendUrl()}${path}`;
  const headers = new Headers(options.headers || {}); 
  headers.set("Content-Type", "application/json");

  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed (${response.status})`);
  }

  return (await response.json()) as T;
}
