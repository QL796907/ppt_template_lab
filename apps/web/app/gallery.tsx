"use client";

import { useState } from "react";
import type { TemplateCard } from "@/lib/download";

export function Gallery({ items }: { items: TemplateCard[] }) {
  const [secret, setSecret] = useState("");
  const [message, setMessage] = useState("");

  async function download(id: string, title: string) {
    setMessage("");
    const response = await fetch(`/api/templates/${id}/download`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const payload = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || !payload.url) {
      setMessage(payload.error ?? `${title} 下载失败`);
      return;
    }
    window.location.assign(payload.url);
  }

  return (
    <>
      <label className="secret">
        下载密钥
        <input
          type="password"
          name="download-secret"
          autoComplete="off"
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
          placeholder="填本地 .env 里的 DOWNLOAD_SECRET"
        />
      </label>
      {message ? <p className="message">{message}</p> : null}
      <div className="grid">
        {items.map((item) => (
          <article className="card" key={item.id}>
            {item.previewUrl ? (
              <img src={item.previewUrl} alt={`${item.title} 的预览`} />
            ) : (
              <div className="placeholder">还没有预览图</div>
            )}
            <div>
              <h2>{item.title}</h2>
              <p className="meta">
                主题 {item.theme || "未填"} · 色调 {item.colorTone || "未填"}
                {item.tags.length > 0 ? ` · 标签 ${item.tags.join("、")}` : ""}
              </p>
              <button type="button" onClick={() => download(item.id, item.title)}>
                下载
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
