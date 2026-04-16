import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

interface Favorite {
  id: number;
  user_id: string;
  coin_id: string;
  coin_name: string | null;
  coin_symbol: string | null;
  coin_image: string | null;
  created_at: number;
}

export const GET: RequestHandler = async ({ platform, url }) => {
  const env = platform!.env;
  const userId = url.searchParams.get("user_id") || "public";

  try {
    const { results } = await env.DB.prepare(
      "SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC"
    )
      .bind(userId)
      .all<Favorite>();

    return json({ favorites: results });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "Database error" },
      { status: 500 }
    );
  }
};

export const POST: RequestHandler = async ({ platform, request }) => {
  const env = platform!.env;

  try {
    const body = (await request.json()) as {
      user_id?: string;
      coin_id?: string;
      coin_name?: string;
      coin_symbol?: string;
      coin_image?: string;
    };
    const { user_id = "public", coin_id, coin_name, coin_symbol, coin_image } = body;

    if (!coin_id) {
      return json({ error: "coin_id is required" }, { status: 400 });
    }

    await env.DB.prepare(
      "INSERT OR IGNORE INTO favorites (user_id, coin_id, coin_name, coin_symbol, coin_image, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
      .bind(user_id, coin_id, coin_name || null, coin_symbol || null, coin_image || null, Date.now())
      .run();

    return json({ success: true, coin_id });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "Database error" },
      { status: 500 }
    );
  }
};

export const DELETE: RequestHandler = async ({ platform, url }) => {
  const env = platform!.env;
  const userId = url.searchParams.get("user_id") || "public";
  const coinId = url.searchParams.get("coin_id");

  if (!coinId) {
    return json({ error: "coin_id is required" }, { status: 400 });
  }

  try {
    await env.DB.prepare(
      "DELETE FROM favorites WHERE user_id = ? AND coin_id = ?"
    )
      .bind(userId, coinId)
      .run();

    return json({ success: true, coin_id: coinId });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "Database error" },
      { status: 500 }
    );
  }
};
