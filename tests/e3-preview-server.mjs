import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
// Synthetic fixtures only; no API, authentication or database connection.
const root = fileURLToPath(new URL("..", import.meta.url));
const server = await createServer({ configFile: false, root, esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": path.join(root, "src") } },
  server: { host: "127.0.0.1", port: 4183, strictPort: true, watch: { ignored: ["**/.next/**", "**/.superpowers/**"] } },
});
await server.listen(); server.printUrls();
