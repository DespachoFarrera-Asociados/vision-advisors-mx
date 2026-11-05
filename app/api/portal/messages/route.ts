import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { messages, memberships } from "@/db/schema";
import { getPortalUser } from "@/lib/portal-auth";

export async function GET(request: Request) {
  const user = await getPortalUser(request);
  if (!user) return NextResponse.json({ message: "Sesión no autorizada." }, { status: 401 });
  const db = getDb(); const [membership] = await db.select({ organizationId: memberships.organizationId }).from(memberships).where(eq(memberships.userId, user.id)).limit(1);
  if (!membership) return NextResponse.json({ messages: [] });
  return NextResponse.json({ messages: await db.select().from(messages).where(eq(messages.organizationId, membership.organizationId)).orderBy(desc(messages.createdAt)) });
}

export async function PATCH(request: Request) {
  const user = await getPortalUser(request);
  if (!user) return NextResponse.json({ message: "Sesión no autorizada." }, { status: 401 });
  const body = (await request.json()) as { id?: string }; const db = getDb();
  const [membership] = await db.select({ organizationId: memberships.organizationId }).from(memberships).where(eq(memberships.userId, user.id)).limit(1);
  if (!body.id || !membership) return NextResponse.json({ message: "Aviso no válido." }, { status: 400 });
  await db.update(messages).set({ readAt: new Date().toISOString() }).where(and(eq(messages.id, body.id), eq(messages.organizationId, membership.organizationId)));
  return NextResponse.json({ message: "Aviso marcado como leído." });
}
