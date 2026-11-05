import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";

const AUTH0_USERINFO = "https://visionadvisorslatam.us.auth0.com/userinfo";

type Auth0Profile = {
  sub?: string;
  email?: string;
  name?: string;
};

const PROFILE_CACHE_TTL_MS = 90_000;
const profileCache = new Map<string, { profile: Auth0Profile; expiresAt: number }>();
const profileRequests = new Map<string, Promise<Auth0Profile | null>>();

async function tokenKey(authorization: string) {
  const bytes = new TextEncoder().encode(authorization);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function requestAuth0Profile(authorization: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(AUTH0_USERINFO, {
        headers: { authorization },
        cache: "no-store",
        signal: controller.signal,
      });
      if (response.ok) return (await response.json()) as Auth0Profile;
      if (response.status < 500 && response.status !== 429) return null;
    } catch {
      // A single network interruption must not invalidate an otherwise valid
      // session. Retry once before returning an authorization failure.
    } finally {
      clearTimeout(timeout);
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return null;
}

async function getAuth0Profile(authorization: string) {
  const key = await tokenKey(authorization);
  const cached = profileCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.profile;

  const pending = profileRequests.get(key) ?? requestAuth0Profile(authorization);
  profileRequests.set(key, pending);
  try {
    const profile = await pending;
    if (profile?.sub) {
      if (profileCache.size >= 200) profileCache.delete(profileCache.keys().next().value as string);
      profileCache.set(key, { profile, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS });
    }
    return profile;
  } finally {
    profileRequests.delete(key);
  }
}

export async function getPortalUser(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;

  const profile = await getAuth0Profile(authorization);
  if (!profile?.sub) return null;

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
