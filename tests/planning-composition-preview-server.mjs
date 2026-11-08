import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
const root = fileURLToPath(new URL("..", import.meta.url));
const adapters = path.join(root, "tests/admin-preview-adapters.tsx");
const api = path.join(root, "tests/planning-composition-preview-api.ts");
const server = await createServer({
  configFile: false,
  root,
  optimizeDeps: { entries: ["tests/planning-composition-preview.html"] },
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: [
      { find: /^@\/lib\/(client-api|planning-client)$/, replacement: api },
      { find: /^next\/link$/, replacement: adapters + "?link" },
      { find: /^next\/navigation$/, replacement: adapters },
      { find: "@", replacement: path.join(root, "src") },
    ],
  },
  plugins: [
    {
      name: "planning-preview",
      transform(code, id) {
        if (id.endsWith("admin-preview-adapters.tsx?link"))
          return code + "\nexport default Link;";
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: 4187,
    strictPort: true,
    watch: { ignored: ["**/.next/**"] },
  },
});
await server.listen();
server.printUrls();
