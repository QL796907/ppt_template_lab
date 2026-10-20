import { listTemplates, type TemplateCard } from "@/lib/download";
import { Gallery } from "./gallery";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const theme = params.theme?.trim() ?? "";
  const tag = params.tag?.trim() ?? "";
  let items: TemplateCard[] = [];
  let error = "";
  try {
    items = await listTemplates({ theme, tag });
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "目录暂时读不出来";
  }

  return (
    <main>
      <h1>PPT 模板库</h1>
      <p className="lead">先看预览，选中后再下载。预览大约两分钟后会过期，刷新页面即可重新看图。</p>
      <form className="filters">
        <label>
          主题
          <input name="theme" defaultValue={theme} placeholder="例如 商务" />
        </label>
        <label>
          标签
          <input name="tag" defaultValue={tag} placeholder="例如 深色" />
        </label>
        <button type="submit">筛选</button>
        <a className="clear" href="/">
          清除
        </a>
      </form>
      {error ? <p className="error">{error}</p> : null}
      {!error && items.length === 0 ? <p className="empty">没有符合的模板。</p> : null}
      {items.length > 0 ? <Gallery items={items} /> : null}
    </main>
  );
}
