import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const CACHE_TTL = 60; // 1 minute cache

export const GET: RequestHandler = async ({ platform, url }) => {
  const env = platform!.env;
  const key = url.searchParams.get("key") || "default";
  const cacheKey = `cache:${key}`;

  try {
    // Try to get from KV cache
    const cached = await env.SESSIONS.get(cacheKey);
    if (cached) {
      return json({
        data: JSON.parse(cached),
        cached: true,
        key,
      });
    }

    // Generate fresh data (simulated)
    const freshData = {
      timestamp: new Date().toISOString(),
      key,
      value: `Data for ${key} generated at ${Date.now()}`,
    };

    // Store in KV with TTL
    await env.SESSIONS.put(cacheKey, JSON.stringify(freshData), {
      expirationTtl: CACHE_TTL,
    });

    return json({
      data: freshData,
      cached: false,
      key,
    });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "Cache error" },
      { status: 500 }
    );
  }
};
