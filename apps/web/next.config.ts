import type { NextConfig } from "next";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";

try {
  loadEnvFile(resolve(import.meta.dirname, "../../.env"));
} catch {
  // 没有本机 .env 时，页面会提示缺哪些变量。
}

const nextConfig: NextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
