import { json, readJson, requireDb, requireUser } from "../../_lib/auth.js";

const MAX_CANVAS_PAYLOAD_BYTES = 1_800_000;
const MAX_ACCOUNT_STORAGE_BYTES = 150_000_000;

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function getTextByteLength(value) {
  return new TextEncoder().encode(value).length;
}

async function getStorageUsage(db, userId) {
  const usage = await db
    .prepare(
      `SELECT
         COALESCE(SUM(length(CAST(data_json AS BLOB))), 0) AS used_bytes,
         COUNT(*) AS file_count
       FROM canvases
       WHERE user_id = ?`
    )
    .bind(userId)
    .first();

  return {
    usedBytes: Number(usage?.used_bytes || 0),
    maxBytes: MAX_ACCOUNT_STORAGE_BYTES,
    maxCanvasBytes: MAX_CANVAS_PAYLOAD_BYTES,
    fileCount: Number(usage?.file_count || 0),
  };
}

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

  return json({
    canvases: results || [],
    storage: await getStorageUsage(db, auth.user.id),
  });
}

export async function onRequestPost({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.response) return auth.response;

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_CANVAS_PAYLOAD_BYTES) {
    return json(
      {
        error: `画布数据 ${formatBytes(contentLength)}，超出云端保存上限 ${formatBytes(MAX_CANVAS_PAYLOAD_BYTES)}。请删除或压缩图片后再保存。`,
      },
      { status: 413 }
    );
  }

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

  const dataBytes = getTextByteLength(dataJson);
  if (dataBytes > MAX_CANVAS_PAYLOAD_BYTES) {
    return json(
      {
        error: `画布数据 ${formatBytes(dataBytes)}，超出云端保存上限 ${formatBytes(MAX_CANVAS_PAYLOAD_BYTES)}。请删除或压缩图片后再保存。`,
      },
      { status: 413 }
    );
  }

  const db = requireDb(env);
  const currentStorage = await getStorageUsage(db, auth.user.id);
  const existingCanvas = body?.id
    ? await db
      .prepare(
        `SELECT length(CAST(data_json AS BLOB)) AS bytes
         FROM canvases
         WHERE id = ? AND user_id = ?`
      )
      .bind(body.id, auth.user.id)
      .first()
    : null;
  const existingBytes = Number(existingCanvas?.bytes || 0);
  const projectedUsedBytes = currentStorage.usedBytes - existingBytes + dataBytes;

  if (projectedUsedBytes > MAX_ACCOUNT_STORAGE_BYTES) {
    return json(
      {
        error: `账号云端空间将达到 ${formatBytes(projectedUsedBytes)}，超出配额 ${formatBytes(MAX_ACCOUNT_STORAGE_BYTES)}。请删除旧画布或移除大图后再保存。`,
      },
      { status: 413 }
    );
  }

  try {
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
  } catch (error) {
    console.error("Failed to save canvas", error);
    return json(
      {
        error: "云端保存失败。若画布包含图片，请删除大图或重新拖入图片后再试。",
      },
      { status: 500 }
    );
  }

  return json({
    canvas: { id, title },
    storage: await getStorageUsage(db, auth.user.id),
  });
}
