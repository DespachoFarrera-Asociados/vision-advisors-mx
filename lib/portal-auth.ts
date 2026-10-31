import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";

const AUTH0_USERINFO = "https://visionadvisorslatam.us.auth0.com/userinfo";

type Auth0Profile = {
  sub?: string;
  email?: string;
  name?: string;
};

export async function getPortalUser(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;

  const response = await fetch(AUTH0_USERINFO, {
    headers: { authorization },
    cache: "no-store",
  });
  if (!response.ok) return null;

  const profile = (await response.json()) as Auth0Profile;
  if (!profile.sub) return null;

  const db = getDb();
  const [portalUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.identitySubject, profile.sub), eq(users.status, "active")))
    .limit(1);

  return portalUser ?? null;
}

export async function requireAdmin(request: Request) {
  const portalUser = await getPortalUser(request);
  if (!portalUser || !["admin", "advisor"].includes(portalUser.platformRole)) return null;
  return portalUser;
}
