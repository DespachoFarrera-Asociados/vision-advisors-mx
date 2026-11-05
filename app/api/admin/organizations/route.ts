import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { auditEvents, documents, fiscalPeriods, memberships, organizations } from "@/db/schema";
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
      rfc: organizations.rfc,
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

  const fiscalDocuments = await db.select({ organizationId: documents.organizationId, fiscalType: documents.fiscalType, opinionSense: documents.opinionSense, validUntil: documents.validUntil, status: documents.status })
    .from(documents).where(and(inArray(documents.fiscalType, ["csf", "opinion"]), eq(documents.isCurrent, true), isNull(documents.deletedAt)));
  const today = new Date().toISOString().slice(0, 10);
  const result = rows.map((organization) => {
    const csf = fiscalDocuments.find((item) => item.organizationId === organization.id && item.fiscalType === "csf");
    const opinion = fiscalDocuments.find((item) => item.organizationId === organization.id && item.fiscalType === "opinion");
    const opinionState = !opinion ? "Sin cargar" : opinion.opinionSense === "negative" ? "Negativa" : opinion.validUntil && opinion.validUntil < today ? "Vencida" : opinion.status === "published" ? "Vigente" : "Borrador";
    return { ...organization, csfStatus: !csf ? "Sin cargar" : csf.status === "published" ? "Vigente" : "Borrador", opinionStatus: opinionState };
  });
  return NextResponse.json({ organizations: result });
}

export async function POST(request: Request) {
  const actor = await requireAdmin(request);
  if (!actor) return forbidden();

  const body = (await request.json()) as { legalName?: string; tradeName?: string; rfc?: string };
  const legalName = body.legalName?.trim();
  const tradeName = body.tradeName?.trim();
  const rfc = body.rfc?.trim().toUpperCase().replace(/\s/g, "");
  if (!legalName || !tradeName || legalName.length > 180 || tradeName.length > 120 || !rfc || !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc)) {
    return NextResponse.json({ message: "Capture razón social, nombre comercial y RFC válidos." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const organizationId = `org_${crypto.randomUUID()}`;
  const db = getDb();

  await db.batch([
    db.insert(organizations).values({
      id: organizationId,
      legalName,
      tradeName,
      rfc,
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

  return NextResponse.json({ id: organizationId, legalName, tradeName, rfc, status: "active" }, { status: 201 });
}

export async function PATCH(request: Request) {
  const actor = await requireAdmin(request);
  if (!actor) return forbidden();
  const body = (await request.json()) as { id?: string; rfc?: string };
  const rfc = body.rfc?.trim().toUpperCase().replace(/\s/g, "");
  if (!body.id || !rfc || !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc)) return NextResponse.json({ message: "El RFC no es válido." }, { status: 400 });
  const db = getDb();
  const [organization] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, body.id)).limit(1);
  if (!organization) return NextResponse.json({ message: "La empresa no existe." }, { status: 404 });
  const now = new Date().toISOString();
  await db.batch([
    db.update(organizations).set({ rfc, updatedAt: now }).where(eq(organizations.id, body.id)),
    db.insert(auditEvents).values({ id: `aud_${crypto.randomUUID()}`, actorUserId: actor.id, organizationId: body.id, action: "organization.rfc.updated", entityType: "organization", entityId: body.id, createdAt: now }),
  ]);
  return NextResponse.json({ message: "RFC actualizado." });
}
