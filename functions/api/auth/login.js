import {
  createSession,
  json,
  normalizeEmail,
  readJson,
  requireDb,
  sessionCookie,
  validateCredentials,
  verifyPassword,
} from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  const db = requireDb(env);
  const body = await readJson(request);
  const email = normalizeEmail(body?.email);
  const password = String(body?.password || "");
  const error = validateCredentials(email, password);

  if (error) return json({ error }, { status: 400 });

  const user = await db
    .prepare("SELECT id, email, password_hash FROM users WHERE email = ?")
    .bind(email)
    .first();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  const token = await createSession(db, user.id);
  return json(
    { user: { id: user.id, email: user.email } },
    { headers: { "set-cookie": sessionCookie(request, token) } }
  );
}
