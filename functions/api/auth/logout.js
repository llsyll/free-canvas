import { clearSessionCookie, getSessionToken, json, requireDb } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  const token = getSessionToken(request);
  if (token) {
    await requireDb(env).prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  }

  return json({ ok: true }, { headers: { "set-cookie": clearSessionCookie() } });
}
