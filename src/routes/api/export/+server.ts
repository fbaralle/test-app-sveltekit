import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ platform, url }) => {
  const env = platform!.env;
  const exportId = url.searchParams.get("id");

  if (!exportId) {
    // List recent exports
    try {
      const list = await env.WEBFLOW_CLOUD_MEDIA.list({ prefix: "exports/", limit: 10 });
      const exports = list.objects.map((obj) => ({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded.toISOString(),
      }));
      return json({ exports });
    } catch (e) {
      return json(
        { error: e instanceof Error ? e.message : "R2 error" },
        { status: 500 }
      );
    }
  }

  // Get specific export
  try {
    const object = await env.WEBFLOW_CLOUD_MEDIA.get(`exports/${exportId}`);
    if (!object) {
      return json({ error: "Export not found" }, { status: 404 });
    }

    const data = await object.text();
    return json({
      id: exportId,
      data: JSON.parse(data),
      metadata: {
        size: object.size,
        uploaded: object.uploaded.toISOString(),
      },
    });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "R2 error" },
      { status: 500 }
    );
  }
};

export const POST: RequestHandler = async ({ platform, request }) => {
  const env = platform!.env;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const exportId = `export-${Date.now()}`;
    const exportData = {
      id: exportId,
      createdAt: new Date().toISOString(),
      data: body,
    };

    await env.WEBFLOW_CLOUD_MEDIA.put(
      `exports/${exportId}`,
      JSON.stringify(exportData),
      {
        httpMetadata: {
          contentType: "application/json",
        },
      }
    );

    return json({
      success: true,
      id: exportId,
      url: `/api/export?id=${exportId}`,
    });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "R2 error" },
      { status: 500 }
    );
  }
};
