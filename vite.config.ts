import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative asset URLs work for both <user>.github.io and
  // <user>.github.io/<repository>/ GitHub Pages deployments.
  base: "./",
  plugins: [react()],
});
