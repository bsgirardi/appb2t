import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["@cantoo/pdf-lib"],
  // The isolated PDF worker loads the CJS entry at runtime, outside the bundle.
  outputFileTracingIncludes: {
    "/api/art/**": [
      "./node_modules/@cantoo/pdf-lib/**/*",
      "./node_modules/culori/**/*",
      "./node_modules/fflate/**/*",
      "./node_modules/node-html-better-parser/**/*",
      "./node_modules/html-entities/**/*",
      "./node_modules/tslib/**/*",
    ],
  },
  async headers() {
    const headers = [
      { key: "Cache-Control", value: "private, no-store" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ];
    return [
      { source: "/portfolio/arte", headers },
      { source: "/api/portfolio/art/:path*", headers },
    ];
  },
  async redirects() {
    return [
      { source: "/portfolio", destination: "/", permanent: true },
      { source: "/catalogo", destination: "/", permanent: true },
    ];
  },
};
export default config;
