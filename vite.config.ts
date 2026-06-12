import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

// The cloudflare() plugin reads wrangler.jsonc, runs the Worker in the same
// dev server as the Vite client, and wires the D1 / R2 / ASSETS bindings.
export default defineConfig({
  plugins: [react(), cloudflare()],
});
