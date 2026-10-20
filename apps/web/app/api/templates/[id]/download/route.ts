import { handleDownload } from "@/lib/download";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const result = await handleDownload(id, request.headers.get("authorization"));
    return Response.json(result.body, {
      status: result.status,
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return Response.json({ error: "生成下载链接失败" }, { status: 500 });
  }
}
