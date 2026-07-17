// const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const api_fetch= async (path: string, options: RequestInit = {})=> {

  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || `Request failed: ${res.status}`);
  }

  return res.json();
}