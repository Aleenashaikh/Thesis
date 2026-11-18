// Base URL from Vite build-time defines or environment variables
const rawBaseUrl = (
  (typeof __BACKEND_URL__ !== "undefined" && __BACKEND_URL__) ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.BACKEND_URL ||
  import.meta.env.API_URL ||
  (typeof process !== "undefined" && process.env?.VITE_API_URL) ||
  ""
).trim().replace(/\/+$/, "");

// Helpful browser console log for verification
if (typeof window !== "undefined") {
  console.log(
    "[LithoScan AI] API Backend Target:",
    rawBaseUrl ? rawBaseUrl : "(Relative /api fallback)"
  );
}

/**
 * Returns the fully qualified API URL for a given endpoint.
 *
 * Examples:
 * - When backend URL is set to "https://backend.vercel.app":
 *     getApiUrl("/login")       => "https://backend.vercel.app/api/login"
 *     getApiUrl("/api/login")   => "https://backend.vercel.app/api/login"
 *     getApiUrl("/cases")       => "https://backend.vercel.app/api/cases"
 * - When backend URL is unset (local development with Vite proxy):
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

  // Handle case where user provided a base URL already ending with /api
  if (rawBaseUrl.endsWith("/api")) {
    return `${rawBaseUrl}${cleanEndpoint.slice(4)}`;
  }

  return `${rawBaseUrl}${cleanEndpoint}`;
}
