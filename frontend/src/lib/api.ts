export const api_fetch = async (path: string, options: RequestInit = {}) => {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const rawError = body.error || body.message || `Request failed: ${res.status}`;
    const errorMessage = typeof rawError === "object" && rawError !== null
      ? rawError.message || rawError.error || rawError.details || JSON.stringify(rawError)
      : String(rawError);
    throw new Error(errorMessage);
  }

  return res.json();
};