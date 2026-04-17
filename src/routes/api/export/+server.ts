import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ platform, url }) => {
  try {
    const r2 = platform?.env?.MEDIA;

    if (!r2) {
      return json(
        { error: "MEDIA R2 binding not available", exports: [] },
        { status: 503 }
      );
    }

    const exportId = url.searchParams.get("id");

    if (!exportId) {
      // List recent exports
      const list = await r2.list({ prefix: "exports/", limit: 10 });
      const exports = list.objects.map((obj) => ({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded.toISOString(),
      }));
      return json({ exports });
    }

    // Get specific export
    const object = await r2.get(`exports/${exportId}`);
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
  try {
    const r2 = platform?.env?.MEDIA;

    if (!r2) {
      return json(
        { error: "MEDIA R2 binding not available" },
        { status: 503 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const exportId = `export-${Date.now()}`;
    const exportData = {
      id: exportId,
      createdAt: new Date().toISOString(),
      data: body,
    };

    await r2.put(
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
