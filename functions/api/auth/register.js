import {
  createSession,
  hashPassword,
  json,
  normalizeEmail,
  readJson,
  requireDb,
  sessionCookie,
  validateCredentials,
} from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  const db = requireDb(env);
  const body = await readJson(request);
  const email = normalizeEmail(body?.email);
  const password = String(body?.password || "");
  const error = validateCredentials(email, password);

  if (error) return json({ error }, { status: 400 });

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  try {
    await db
      .prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)")
      .bind(id, email, passwordHash)
      .run();
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) {
      return json({ error: "该邮箱已注册" }, { status: 409 });
    }
    throw error;
  }

  const token = await createSession(db, id);
  return json(
    { user: { id, email } },
    { headers: { "set-cookie": sessionCookie(request, token) } }
  );
}
