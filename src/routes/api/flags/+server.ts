import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

interface FeatureFlags {
  [key: string]: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  dark_mode: true,
  show_favorites: true,
  show_exports: true,
  show_page_views: true,
  experimental_features: false,
};

export const GET: RequestHandler = async ({ platform }) => {
  try {
    const kv = platform?.env?.FLAGS;

    if (!kv) {
      return json(
        { error: "FLAGS KV binding not available", flags: DEFAULT_FLAGS },
        { status: 503 }
      );
    }

    // Get all flags from KV
    const flags: FeatureFlags = { ...DEFAULT_FLAGS };

    for (const key of Object.keys(DEFAULT_FLAGS)) {
      const value = await kv.get(`flag:${key}`);
      if (value !== null) {
        flags[key] = value === "true";
      }
    }

    return json({ flags });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "KV error", flags: DEFAULT_FLAGS },
      { status: 500 }
    );
  }
};

export const POST: RequestHandler = async ({ platform, request }) => {
  try {
    const kv = platform?.env?.FLAGS;

    if (!kv) {
      return json(
        { error: "FLAGS KV binding not available" },
        { status: 503 }
      );
    }

    const body = (await request.json()) as { flag: string; value: boolean };
    const { flag, value } = body;

    if (!flag || typeof value !== "boolean") {
      return json(
        { error: "flag (string) and value (boolean) are required" },
        { status: 400 }
      );
    }

    if (!(flag in DEFAULT_FLAGS)) {
      return json(
        { error: `Unknown flag: ${flag}` },
        { status: 400 }
      );
    }

    await kv.put(`flag:${flag}`, String(value));

    return json({ success: true, flag, value });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "KV error" },
      { status: 500 }
    );
  }
};
