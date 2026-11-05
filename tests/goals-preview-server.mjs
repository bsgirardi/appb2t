import path from "node:path";
import { createServer } from "vite";
const server = await createServer({
  configFile: false,
  root: process.cwd(),
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: [
      {
        find: /^next\/link$/,
        replacement: path.resolve("tests/intelligence-preview-link.tsx"),
      },
      { find: "@", replacement: path.resolve("src") },
    ],
  },
  server: {
    host: "127.0.0.1",
    port: 4319,
    strictPort: true,
    watch: { ignored: ["**/.next/**"] },
  },
});
await server.listen();
server.printUrls();
