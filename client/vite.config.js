import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Load environment variables from current directory and parent directory (monorepo root)
  const envCurrent = loadEnv(mode, process.cwd(), "");
  const envParent = loadEnv(mode, "..", "");

  const resolvedBackendUrl = (
    process.env.VITE_API_URL ||
    process.env.VITE_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.API_URL ||
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    envCurrent.VITE_API_URL ||
    envCurrent.VITE_BACKEND_URL ||
    envCurrent.BACKEND_URL ||
    envCurrent.API_URL ||
    envParent.VITE_API_URL ||
    envParent.VITE_BACKEND_URL ||
    envParent.BACKEND_URL ||
    envParent.API_URL ||
    ""
  ).trim();

  return {
    plugins: [react()],
    envPrefix: ["VITE_", "BACKEND_", "API_", "REACT_APP_"],
    define: {
      __BACKEND_URL__: JSON.stringify(resolvedBackendUrl),
      "process.env.VITE_API_URL": JSON.stringify(resolvedBackendUrl),
      "process.env.BACKEND_URL": JSON.stringify(resolvedBackendUrl),
      "process.env.API_URL": JSON.stringify(resolvedBackendUrl),
    },
    server: {
      proxy: {
        "/api": "http://localhost:5000",
      },
    },
  };
});
