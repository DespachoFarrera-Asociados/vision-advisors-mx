import { asc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { auditEvents, fiscalPeriods, memberships, organizations } from "@/db/schema";
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
      id: organizations.id,
      legalName: organizations.legalName,
      tradeName: organizations.tradeName,
      status: organizations.status,
      createdAt: organizations.createdAt,
      members: sql<number>`count(distinct ${memberships.id})`,
      periods: sql<number>`count(distinct ${fiscalPeriods.id})`,
    })
    .from(organizations)
    .leftJoin(memberships, eq(memberships.organizationId, organizations.id))
    .leftJoin(fiscalPeriods, eq(fiscalPeriods.organizationId, organizations.id))
    .groupBy(organizations.id)
    .orderBy(asc(organizations.tradeName));

  return NextResponse.json({ organizations: rows });
}

export async function POST(request: Request) {
  const actor = await requireAdmin(request);
  if (!actor) return forbidden();

  const body = (await request.json()) as { legalName?: string; tradeName?: string };
  const legalName = body.legalName?.trim();
  const tradeName = body.tradeName?.trim();
  if (!legalName || !tradeName || legalName.length > 180 || tradeName.length > 120) {
    return NextResponse.json({ message: "Capture una razón social y un nombre comercial válidos." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const organizationId = `org_${crypto.randomUUID()}`;
  const db = getDb();

  await db.batch([
    db.insert(organizations).values({
      id: organizationId,
      legalName,
      tradeName,
      status: "active",
      createdAt: now,
      updatedAt: now,
    }),
    db.insert(auditEvents).values({
      id: `aud_${crypto.randomUUID()}`,
      actorUserId: actor.id,
      organizationId,
      action: "organization.created",
      entityType: "organization",
      entityId: organizationId,
      createdAt: now,
    }),
  ]);

  return NextResponse.json({ id: organizationId, legalName, tradeName, status: "active" }, { status: 201 });
}
