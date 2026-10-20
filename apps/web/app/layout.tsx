import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "PPT 模板库",
  description: "按预览挑选模板，再下载。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
