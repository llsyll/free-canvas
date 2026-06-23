import { json, readJson, requireDb, requireUser } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;

  const db = requireDb(env);
  const { results } = await db
    .prepare(
      `SELECT id, title, created_at, updated_at
       FROM canvases
       WHERE user_id = ?
       ORDER BY updated_at DESC`
    )
    .bind(auth.user.id)
    .all();

  return json({ canvases: results || [] });
}

export async function onRequestPost({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;

  const body = await readJson(request);
  const data = body?.data;
  const nodes = data?.nodes;
  const edges = data?.edges;

  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    return json({ error: "画布数据格式不正确" }, { status: 400 });
  }

  const id = body?.id || crypto.randomUUID();
  const title = String(body?.title || "未命名画布").trim().slice(0, 80) || "未命名画布";
  const dataJson = JSON.stringify({
    source: "free-canvas-cloud",
    version: "1.0",
    nodes,
    edges,
  });

  const db = requireDb(env);
  await db
    .prepare(
      `INSERT INTO canvases (id, user_id, title, data_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         data_json = excluded.data_json,
         updated_at = datetime('now')
       WHERE canvases.user_id = excluded.user_id`
    )
    .bind(id, auth.user.id, title, dataJson)
    .run();

  return json({ canvas: { id, title } });
}
