import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

// Synthetic presentation only. No Next backend, authentication or database.
const root = fileURLToPath(new URL("..", import.meta.url));
const adapters = path.join(root, "tests/finance-reading-preview-adapters.tsx");
const server = await createServer({
  configFile: false,
  root,
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: [
      { find: /^next\/link$/, replacement: adapters + "?link" },
      { find: /^next\/image$/, replacement: adapters + "?image" },
      { find: /^next\/navigation$/, replacement: adapters },
      { find: "@", replacement: path.join(root, "src") },
    ],
  },
  plugins: [
    {
      name: "finance-reading-preview-adapters",
      transform(code, id) {
        if (id.endsWith("finance-reading-preview-adapters.tsx?link"))
          return (
            code +
            '\nexport { Link as default } from "./admin-preview-adapters";'
          );
        if (id.endsWith("finance-reading-preview-adapters.tsx?image"))
          return (
            code +
            '\nexport { Image as default } from "./admin-preview-adapters";'
          );
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: 4177,
    strictPort: true,
    watch: { ignored: ["**/.next/**", "**/.superpowers/**"] },
  },
});
await server.listen();
server.printUrls();
