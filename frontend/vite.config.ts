import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  base: "/Ai-tune-and-refine/",
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
