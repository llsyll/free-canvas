import { json, requireDb, requireUser } from "../../_lib/auth.js";

export async function onRequestGet({ request, env, params }) {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;

  const canvas = await requireDb(env)
    .prepare(
      `SELECT id, title, data_json, created_at, updated_at
       FROM canvases
       WHERE id = ? AND user_id = ?`
    )
    .bind(params.id, auth.user.id)
    .first();

  if (!canvas) return json({ error: "文件不存在" }, { status: 404 });

  return json({
    canvas: {
      id: canvas.id,
      title: canvas.title,
      created_at: canvas.created_at,
      updated_at: canvas.updated_at,
      data: JSON.parse(canvas.data_json),
    },
  });
}

export async function onRequestDelete({ request, env, params }) {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;

  await requireDb(env)
    .prepare("DELETE FROM canvases WHERE id = ? AND user_id = ?")
    .bind(params.id, auth.user.id)
    .run();

  return json({ ok: true });
}
