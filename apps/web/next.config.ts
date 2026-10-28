import type { NextConfig } from "next";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";

function isEnoent(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

try {
  loadEnvFile(resolve(import.meta.dirname, "../../.env"));
} catch (error) {
  // 没有本机 .env 时，页面会提示缺哪些变量。文件在但读不出来时要停。
  if (!isEnoent(error)) {
    throw error;
  }
}

const nextConfig: NextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
