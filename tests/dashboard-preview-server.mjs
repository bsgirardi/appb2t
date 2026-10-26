import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
const root = fileURLToPath(new URL("..", import.meta.url));
const adapters = path.join(root, "tests/dashboard-preview-adapters.tsx");
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
      name: "dashboard-preview-adapters",
      transform(code, id) {
        if (id.endsWith("dashboard-preview-adapters.tsx?link"))
          return (
            code +
            '\nimport { Link } from "./admin-preview-adapters";export default Link;'
          );
        if (id.endsWith("dashboard-preview-adapters.tsx?image"))
          return (
            code +
            '\nimport { Image } from "./admin-preview-adapters";export default Image;'
          );
      },
    },
  ],
  server: { host: "127.0.0.1", port: 4175, strictPort: true, watch: { ignored: ["**/.next/**", "**/.superpowers/**"] } },
});
await server.listen();
server.printUrls();
