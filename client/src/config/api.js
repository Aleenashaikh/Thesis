// Base URL from Vite environment variables (VITE_API_URL or VITE_BACKEND_URL)
const rawBaseUrl = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  ""
).trim().replace(/\/+$/, "");

/**
 * Returns the fully qualified API URL for a given endpoint.
 *
 * Examples:
 * - When VITE_API_URL="https://backend.vercel.app":
 *     getApiUrl("/login")       => "https://backend.vercel.app/api/login"
 *     getApiUrl("/api/login")   => "https://backend.vercel.app/api/login"
 *     getApiUrl("/cases")       => "https://backend.vercel.app/api/cases"
 * - When VITE_API_URL is unset (local development with Vite proxy):
 *     getApiUrl("/login")       => "/api/login"
 *     getApiUrl("/api/login")   => "/api/login"
 */
export function getApiUrl(endpoint) {
  let cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  // Ensure path starts with /api
  if (!cleanEndpoint.startsWith("/api")) {
    cleanEndpoint = `/api${cleanEndpoint}`;
  }

  if (!rawBaseUrl) {
    return cleanEndpoint;
  }

  // Handle case where user provided base URL already ending with /api
  if (rawBaseUrl.endsWith("/api")) {
    return `${rawBaseUrl}${cleanEndpoint.slice(4)}`;
  }

  return `${rawBaseUrl}${cleanEndpoint}`;
}
