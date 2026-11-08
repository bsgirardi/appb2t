import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

// Fixtures only: no Next backend, secrets, authentication bypass or database.
const root = fileURLToPath(new URL("..", import.meta.url));
const adapters = path.join(root, "tests/admin-preview-adapters.tsx");
const server = await createServer({
  configFile: false,
  root,
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: [
      { find: /^next\/link$/, replacement: adapters + "?link" },
      { find: /^next\/image$/, replacement: adapters + "?image" },
      { find: /^next\/navigation$/, replacement: adapters },
      {
        find: /^@\/server\/appearance$/,
        replacement: path.join(
          root,
          "tests/login-catalog-preview-appearance.ts",
        ),
      },
      { find: "@", replacement: path.join(root, "src") },
    ],
  },
  plugins: [
    {
      name: "preview-next-adapters",
      transform(code, id) {
        if (id.endsWith("admin-preview-adapters.tsx?link"))
          return code + "\nexport default Link;";
        if (id.endsWith("admin-preview-adapters.tsx?image"))
          return code + "\nexport default Image;";
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: Number(process.env.PORT ?? 4332),
    strictPort: true,
  },
});
await server.listen();
server.printUrls();
