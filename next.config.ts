import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/portfolio", destination: "/", permanent: true },
      { source: "/catalogo", destination: "/", permanent: true },
    ];
  },
};
export default config;
