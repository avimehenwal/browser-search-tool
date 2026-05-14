import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Ensure each route emits an `index.html` in its folder
  // so static servers (and trailing slashes) serve pages correctly.
  trailingSlash: true,
  basePath: "/browser-search-tool",
  assetPrefix: "/browser-search-tool",
};

export default nextConfig;
