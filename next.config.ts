import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@codemirror/state": path.resolve("./node_modules/@codemirror/state"),
      "@codemirror/view": path.resolve("./node_modules/@codemirror/view"),
    };
    return config;
  },
};

export default nextConfig;
