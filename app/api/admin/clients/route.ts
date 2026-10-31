import { and, asc, eq, ne, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { auditEvents, memberships, organizations, users } from "@/db/schema";
import { requireAdmin } from "@/lib/portal-auth";

function forbidden() {
  return NextResponse.json({ message: "Acceso reservado al equipo de Vision Advisors." }, { status: 403 });
}

export async function GET(request: Request) {
  const actor = await requireAdmin(request);
  if (!actor) return forbidden();

  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      platformRole: users.platformRole,
      status: users.status,
      lastAccessAt: users.lastAccessAt,
      organizationId: memberships.organizationId,
      organizationName: organizations.tradeName,
      membershipRole: memberships.role,
    })
    .from(users)
    .leftJoin(memberships, eq(memberships.userId, users.id))
    .leftJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(eq(users.platformRole, "client"))
    .orderBy(asc(users.email));

  return NextResponse.json({ clients: rows });
}

export async function POST(request: Request) {
  const actor = await requireAdmin(request);
  if (!actor) return forbidden();

  const body = (await request.json()) as {
    identitySubject?: string;
    email?: string;
    displayName?: string;
    organizationId?: string;
    membershipRole?: "viewer" | "manager";
  };
  const identitySubject = body.identitySubject?.trim();
  const email = body.email?.trim().toLowerCase();
  const displayName = body.displayName?.trim().toUpperCase();
  const organizationId = body.organizationId?.trim();
  const membershipRole = body.membershipRole ?? "viewer";

  if (!identitySubject?.startsWith("auth0|") || !email?.includes("@") || !displayName || !organizationId || !["viewer", "manager"].includes(membershipRole)) {
    return NextResponse.json({ message: "Capture el RFC, correo, ID de usuario Auth0 y empresa válidos." }, { status: 400 });
  }

  const db = getDb();
  const [[existing], [organization]] = await Promise.all([
    db.select({ id: users.id }).from(users).where(or(eq(users.identitySubject, identitySubject), eq(users.email, email))).limit(1),
    db.select({ id: organizations.id }).from(organizations).where(and(eq(organizations.id, organizationId), ne(organizations.status, "archived"))).limit(1),
  ]);
  if (existing) return NextResponse.json({ message: "Ese ID de Auth0 o correo ya está registrado en el portal." }, { status: 409 });
  if (!organization) return NextResponse.json({ message: "La empresa seleccionada ya no está disponible." }, { status: 404 });

  const now = new Date().toISOString();
  const userId = `usr_${crypto.randomUUID()}`;
  await db.batch([
    db.insert(users).values({ id: userId, identitySubject, email, displayName, platformRole: "client", status: "active", createdAt: now, updatedAt: now }),
    db.insert(memberships).values({ id: `mem_${crypto.randomUUID()}`, organizationId, userId, role: membershipRole, createdAt: now }),
    db.insert(auditEvents).values({
      id: `aud_${crypto.randomUUID()}`,
      actorUserId: actor.id,
      organizationId,
      action: "client.access.created",
      entityType: "user",
      entityId: userId,
      metadataJson: JSON.stringify({ identitySubject, email, membershipRole }),
      createdAt: now,
    }),
  ]);

  return NextResponse.json({ message: "Cliente incorporado y vinculado con la empresa." }, { status: 201 });
}

export async function PATCH(request: Request) {
  const actor = await requireAdmin(request);
  if (!actor) return forbidden();

  const body = (await request.json()) as {
    userId?: string;
    organizationId?: string;
    status?: "active" | "suspended";
    membershipRole?: "viewer" | "manager";
  };
  const userId = body.userId?.trim();
  const organizationId = body.organizationId?.trim();
  const status = body.status;
  const membershipRole = body.membershipRole ?? "viewer";

  if (!userId || !organizationId || !["active", "suspended"].includes(status ?? "") || !["viewer", "manager"].includes(membershipRole)) {
    return NextResponse.json({ message: "Seleccione un cliente, una empresa, un rol y un estado válidos." }, { status: 400 });
  }

  const db = getDb();
  const [[client], [organization], [targetMembership]] = await Promise.all([
    db.select({ id: users.id }).from(users).where(and(eq(users.id, userId), eq(users.platformRole, "client"))).limit(1),
    db.select({ id: organizations.id }).from(organizations).where(and(eq(organizations.id, organizationId), ne(organizations.status, "archived"))).limit(1),
    db.select({ id: memberships.id }).from(memberships).where(and(eq(memberships.userId, userId), eq(memberships.organizationId, organizationId))).limit(1),
  ]);
  if (!client || !organization) return NextResponse.json({ message: "El cliente o la empresa ya no están disponibles." }, { status: 404 });

  const now = new Date().toISOString();
  const membershipId = targetMembership?.id ?? `mem_${crypto.randomUUID()}`;
  await db.batch([
    db.delete(memberships).where(eq(memberships.userId, userId)),
    db.insert(memberships).values({ id: membershipId, organizationId, userId, role: membershipRole, createdAt: now }),
    db.update(users).set({ status, updatedAt: now }).where(eq(users.id, userId)),
    db.insert(auditEvents).values({
      id: `aud_${crypto.randomUUID()}`,
      actorUserId: actor.id,
      organizationId,
      action: "client.assignment.updated",
      entityType: "user",
      entityId: userId,
      metadataJson: JSON.stringify({ status, membershipRole }),
      createdAt: now,
    }),
  ]);

  return NextResponse.json({ message: status === "active" ? "Cliente vinculado y acceso activo." : "Cliente vinculado con acceso suspendido." });
}
